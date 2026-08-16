import net from "net";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Node's Happy Eyeballs gives each candidate address only 250ms by default.
// Neon's us-east-2 pooler answers in ~280ms from here, and hosts without an
// IPv6 route burn the remaining attempts instantly, so every connection died
// with an aggregate ETIMEDOUT at ~750ms. Give each attempt a realistic window.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Singleton PrismaClient — reused across hot reloads in dev so we don't
// exhaust Neon's connection pool.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
