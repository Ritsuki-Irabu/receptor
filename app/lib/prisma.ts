import { PrismaClient } from "@prisma/client";

// Hot Reload 時に PrismaClient が重複生成されないようグローバルにシングルトン管理
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
