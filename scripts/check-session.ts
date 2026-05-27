import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

(async () => {
    const sessions = await prisma.session.findMany({
        include: { user: { select: { email: true } } },
    });
    console.log("Sessions in DB:", sessions.length);
    console.log(sessions);
    await prisma.$disconnect();
})();
