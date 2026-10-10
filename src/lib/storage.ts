import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface StorageProvider {
  // Takes raw bytes + a trusted extension (never the client-supplied
  // filename/MIME — see sniffImageType below for why) and returns a
  // public URL.
  upload(buffer: Buffer, ext: string): Promise<string>;
}

// Works out of the box with zero setup — writes into /public/uploads.
// Fine for local dev and a single-server demo; NOT durable on most
// serverless hosts (Vercel's filesystem is ephemeral), so production
// must switch to the S3-compatible provider below.
class LocalDiskStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, ext: string): Promise<string> {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), buffer);
    return `/uploads/${filename}`;
  }
}

// Production provider: any S3-compatible bucket (Cloudflare R2 is the best
// fit: free 10GB, no egress fees; Supabase Storage's S3 API also works).
// Activated automatically when all S3_* variables are set.
class S3StorageProvider implements StorageProvider {
  private client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_KEY!, secretAccessKey: process.env.S3_SECRET! },
    forcePathStyle: true,
  });
  async upload(buffer: Buffer, ext: string): Promise<string> {
    const key = `listings/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${(process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "")}/${key}`;
  }
}

const hasS3 = !!(process.env.S3_ENDPOINT && process.env.S3_KEY && process.env.S3_SECRET && process.env.S3_BUCKET && process.env.S3_PUBLIC_BASE_URL);

export const storageProvider: StorageProvider = hasS3 ? new S3StorageProvider() : new LocalDiskStorageProvider();

// 4MB: serverless hosts (Vercel) reject request bodies above ~4.5MB.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// A client can set the multipart Content-Type header (and filename) to
// ANYTHING regardless of what bytes actually follow — a script can claim
// "image/jpeg" while uploading an .html file full of <script> tags. The
// upload route used to trust file.type and file.name for the saved
// extension, which meant that spoofed content-type could end up served
// back as a differently-typed file. This sniffs the real file signature
// instead, so the extension we save with is based on what the bytes
// actually are, not what the client claims.
const SIGNATURES: { ext: "jpg" | "png" | "webp"; bytes: number[]; offset?: number }[] = [
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: "webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // "WEBP" at byte 8 of a RIFF container
];

export function sniffImageExt(buffer: Buffer): "jpg" | "png" | "webp" | null {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const matches = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (matches) return sig.ext;
  }
  return null;
}

// Listing/avatar image URLs come back from the client in the JSON body, so
// they must be checked: without this, a seller could point a listing at ANY
// external URL (tracking pixels that leak every viewer's IP, hotlinked
// abusive images, ...). Only files WE stored are accepted.
export function isOwnedImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > 500) return false;
  if (url.startsWith("/uploads/") && !url.includes("..")) return true;
  const base = process.env.S3_PUBLIC_BASE_URL;
  return !!base && url.startsWith(base.replace(/\/$/, "") + "/");
}

export const MAX_IMAGES_PER_LISTING = 8;
