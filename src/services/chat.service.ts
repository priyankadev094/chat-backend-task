import { FieldValue } from "firebase-admin/firestore";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { firestore } from "../config/firebase";

const messages = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("messages");

const receipts = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("receipts");

const lastSeen = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("lastSeen");

function validateText(text: string): string {
  const value = text.trim();

  if (!value || value.length > 5000) {
    throw new Error("INVALID_MESSAGE_TEXT");
  }

  return value;
}

async function ensureChat(chatId: string): Promise<void> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true },
  });

  if (!chat) {
    throw new Error("CHAT_NOT_FOUND");
  }
}

async function ensureMember(
  chatId: string,
  userId: string
): Promise<void> {
  const member = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: { chatId, userId },
    },
  });

  if (!member) {
    throw new Error("CHAT_ACCESS_DENIED");
  }
}


export async function createOrGetChat(
  userAId: string,
  userBId: string
) {
  if (userAId === userBId) {
    throw new Error("CANNOT_CHAT_WITH_SELF");
  }

  const [userLowId, userHighId] = [userAId, userBId].sort();

  return prisma.$transaction(async (tx : Prisma.TransactionClient) => {
    const users = await tx.user.findMany({
      where: {
        id: { in: [userLowId, userHighId] },
      },
      select: { id: true },
    });

    if (users.length !== 2) {
      throw new Error("USER_NOT_FOUND");
    }

    const chat = await tx.chat.upsert({
      where: {
        userLowId_userHighId: {
          userLowId,
          userHighId,
        },
      },
      create: {
        userLowId,
        userHighId,
        members: {
          create: [
            { userId: userLowId },
            { userId: userHighId },
          ],
        },
      },
      update: {},
      select: { id: true },
    });

    return { chatId: chat.id };
  });
}


export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
) {
  const normalizedText = validateText(text);

  await ensureMember(chatId, senderId);

  const ref = messages(chatId).doc();

  await ref.create({
    senderId,
    text: normalizedText,
    createdAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();

  return {
    messageId: ref.id,
    ...saved.data(),
  };
}


export async function getMessages(
  chatId: string,
  limit: number
) {
  await ensureChat(chatId);

  const snapshot = await messages(chatId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.reverse().map((doc) => ({
    messageId: doc.id,
    ...doc.data(),
  }));
}


export async function markMessageRead(
  chatId: string,
  messageId: string,
  userId: string
) {
  await ensureMember(chatId, userId);

  const message = await messages(chatId).doc(messageId).get();

  if (!message.exists) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  const receiptId = `${messageId}_${userId}`;

  await receipts(chatId).doc(receiptId).set(
    {
      messageId,
      userId,
      readAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
}


export async function updateLastSeen(
  chatId: string,
  userId: string,
  messageId: string
) {
  await ensureMember(chatId, userId);

  const message = await messages(chatId).doc(messageId).get();

  if (!message.exists) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  await lastSeen(chatId).doc(userId).set({
    messageId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, messageId };
}


type UserChatMembership = {
    chat: {
      id: string;
      createdAt: Date;
      members: {
        userId: string;
      }[];
    };
  };

  
export async function listUserChats(userId: string) {
    const memberships: UserChatMembership[] = await prisma.chatMember.findMany({
    where: { userId },
    include: {
      chat: {
        include: {
          members: {
            select: { userId: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map(({ chat }) => ({
    chatId: chat.id,
    memberIds: chat.members.map((member) => member.userId),
    createdAt: chat.createdAt,
  }));
}