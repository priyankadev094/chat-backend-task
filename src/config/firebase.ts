import "dotenv/config";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const existingApp = getApps()[0];

const firebaseApp =
  existingApp ??
  initializeApp({
    credential: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? cert(
          JSON.parse(
            readFileSync(
              process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
              "utf8"
            )
          )
        )
      : applicationDefault(),
  });

export const firestore = getFirestore(firebaseApp);