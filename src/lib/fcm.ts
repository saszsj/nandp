"use client";

import { getToken } from "firebase/messaging";
import { getMessagingIfSupported } from "@/lib/firebase";

export async function requestFcmToken() {
  if (typeof window === "undefined") return null;
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  return getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
  });
}
