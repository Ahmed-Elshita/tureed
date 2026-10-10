import { PrismaClient } from "@prisma/client";

// Serverless-safe connection string. On Vercel every function instance opens
// its own pool, and Supabase's pooler (port 6543, PgBouncer in transaction
// mode) rejects Prisma's prepared statements unless `pgbouncer=true` is set.
// Forgetting those two query flags is the classic "works with little data,
// crashes under load" failure, so we add them automatically when missing.
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const pooled = u.port === "6543" || u.hostname.includes("pooler");
    if (pooled && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    if (process.env.VERCEL && !u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    return u.toString();
  } catch {
    return raw;
  }
}

// Standard Next.js singleton pattern so hot-reload in dev doesn't
// open a new DB connection pool on every save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
