import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

(async () => {
    const allLogs = await prisma.thoughtLog.findMany({
        orderBy: { createdAt: "asc" },
        include: { analysisResult: { include: { scores: true } } },
    });

    // 5カテゴリの平均 × 100 が1以下のログを対象にする
    const targets = allLogs.filter((l) => {
        if (!l.analysisResult) return true;
        const s = l.analysisResult.scores;
        const sum = s.reduce((acc, cur) => acc + cur.score, 0);
        return Math.round((sum / 5) * 100) <= 1;
    });

    console.log(`削除対象: ${targets.length} 件`);
    targets.forEach((l) => {
        const s = l.analysisResult?.scores ?? [];
        const sum = s.reduce((acc, cur) => acc + cur.score, 0);
        const score = Math.round((sum / 5) * 100);
        console.log(` - score:${score} [${l.createdAt.toISOString()}] "${l.content.slice(0, 40)}"`);
    });

    const ids = targets.map((l) => l.id);
    const resultIds = targets.flatMap((l) => l.analysisResult ? [l.analysisResult.id] : []);

    await prisma.analysisScore.deleteMany({ where: { analysisResultId: { in: resultIds } } });
    await prisma.analysisResult.deleteMany({ where: { id: { in: resultIds } } });
    await prisma.thoughtLog.deleteMany({ where: { id: { in: ids } } });

    console.log("削除完了");
    await prisma.$disconnect();
})();
