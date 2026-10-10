import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Open /api/health on the deployed site to check the database connection.
// Returns only a short error CODE, never the connection string or message.
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const [categories, products] = await Promise.all([db.category.count(), db.product.count()]);
    return NextResponse.json({ ok: true, db: true, categories, products, ms: Date.now() - started });
  } catch (e) {
    const code =
      e instanceof Prisma.PrismaClientKnownRequestError ? e.code
      : e instanceof Prisma.PrismaClientInitializationError ? e.errorCode ?? "init_error"
      : "unknown";
    return NextResponse.json({ ok: false, db: false, code }, { status: 503 });
  }
}
