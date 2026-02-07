import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminTimestamp } from "@/lib/firebaseAdmin";

type Body = {
  boutiqueId?: string;
  email?: string;
  password?: string;
  displayName?: string;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const adminProfile = await adminDb.collection("users").doc(decoded.uid).get();
  if (!adminProfile.exists || adminProfile.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as Body;
  const email = body.email?.trim();
  const password = body.password;
  const boutiqueId = body.boutiqueId;
  const displayName = body.displayName?.trim();

  if (!email || !password || !boutiqueId) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  let userRecord;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    userRecord = await adminAuth.updateUser(existing.uid, {
      password,
      displayName: displayName || existing.displayName || undefined,
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") {
      throw error;
    }
    userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || undefined,
    });
  }

  await adminDb
    .collection("users")
    .doc(userRecord.uid)
    .set(
      {
        role: "gerant",
        boutiqueId,
        email,
        displayName: displayName || undefined,
        updatedAt: adminTimestamp,
      },
      { merge: true }
    );

  return NextResponse.json({ uid: userRecord.uid });
}
