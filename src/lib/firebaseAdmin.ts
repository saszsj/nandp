import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const raw = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    return JSON.parse(raw);
  }
  throw new Error("Missing Firebase service account env.");
}

if (!getApps().length) {
  initializeApp({
    credential: cert(loadServiceAccount()),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminTimestamp = FieldValue.serverTimestamp();
