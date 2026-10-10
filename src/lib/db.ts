import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern so hot-reload in dev doesn't
// open a new DB connection pool on every save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
