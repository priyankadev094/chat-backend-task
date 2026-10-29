import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  createOrGetChat,
  sendMessage,
  getMessages,
  markMessageRead,
  updateLastSeen,
  listUserChats,
} from "../services/chat.service";

const router = Router();

const idSchema = z.string().min(1).max(128);

const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<unknown>
) => (
  req: Request,
  res: Response,
  next: (error?: unknown) => void
) => {
  handler(req, res).catch(next);
};

// POST /chat/create
router.post(
  "/chat/create",
  asyncHandler(async (req, res) => {
    const body = z.object({
      userAId: idSchema,
      userBId: idSchema,
    }).parse(req.body);

    const result = await createOrGetChat(
      body.userAId,
      body.userBId
    );

    res.status(200).json(result);
  })
);

// POST /chat/:chatId/message/send
router.post(
  "/chat/:chatId/message/send",
  asyncHandler(async (req, res) => {
    const params = z.object({
      chatId: idSchema,
    }).parse(req.params);

    const body = z.object({
      senderId: idSchema,
      text: z.string().trim().min(1).max(5000),
    }).parse(req.body);

    const result = await sendMessage(
      params.chatId,
      body.senderId,
      body.text
    );

    res.status(201).json(result);
  })
);

// GET /chat/:chatId/messages?limit=50
router.get(
  "/chat/:chatId/messages",
  asyncHandler(async (req, res) => {
    const params = z.object({
      chatId: idSchema,
    }).parse(req.params);

    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);

    const result = await getMessages(
      params.chatId,
      query.limit
    );

    res.json({ messages: result });
  })
);

// POST /chat/:chatId/message/:messageId/read
router.post(
  "/chat/:chatId/message/:messageId/read",
  asyncHandler(async (req, res) => {
    const params = z.object({
      chatId: idSchema,
      messageId: idSchema,
    }).parse(req.params);

    const body = z.object({
      userId: idSchema,
    }).parse(req.body);

    const result = await markMessageRead(
      params.chatId,
      params.messageId,
      body.userId
    );

    res.json(result);
  })
);

// POST /chat/:chatId/lastseen
router.post(
  "/chat/:chatId/lastseen",
  asyncHandler(async (req, res) => {
    const params = z.object({
      chatId: idSchema,
    }).parse(req.params);

    const body = z.object({
      userId: idSchema,
      messageId: idSchema,
    }).parse(req.body);

    const result = await updateLastSeen(
      params.chatId,
      body.userId,
      body.messageId
    );

    res.json(result);
  })
);

// GET /user/:userId/chats
router.get(
  "/user/:userId/chats",
  asyncHandler(async (req, res) => {
    const params = z.object({
      userId: idSchema,
    }).parse(req.params);

    const result = await listUserChats(params.userId);

    res.json({ chats: result });
  })
);

export default router;