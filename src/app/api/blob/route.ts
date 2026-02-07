import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const filename =
    typeof formData.get("filename") === "string"
      ? String(formData.get("filename"))
      : file.name;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`uploads/${Date.now()}-${safeName}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
