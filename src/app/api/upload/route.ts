import { NextRequest, NextResponse } from "next/server";
import { storageProvider, MAX_IMAGE_BYTES, sniffImageExt } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/spamGuard";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Uploads previously had no rate limit at all — a logged-in user could
  // script thousands of uploads and fill disk/storage costs.
  const limited = await checkRateLimit(`upload:${userId}`, 60, 60 * 60); // 60/hour
  if (!limited.allowed) {
    return NextResponse.json({ error: "too_many_uploads" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "file_too_large_or_empty" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // The client-supplied file.type header is trivially spoofable (a
  // script can label any bytes "image/jpeg"), so it is NOT trusted here.
  // The real file signature is what decides both whether this is
  // actually an image and what extension it's saved with.
  const ext = sniffImageExt(buffer);
  if (!ext) {
    return NextResponse.json({ error: "file_is_not_a_supported_image" }, { status: 415 });
  }

  const url = await storageProvider.upload(buffer, ext);
  return NextResponse.json({ url });
}
