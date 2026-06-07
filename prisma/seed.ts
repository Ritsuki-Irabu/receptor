import "dotenv/config";
import { PrismaClient, ThinkingCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const logs = [
  {
    content:
      "今日のプロジェクトの問題を分解して考えた。根本原因はデータ設計の不整合にあると判断した。優先度を整理して対処法を決めた。",
    scores: {
      [ThinkingCategory.analytical]: 0.85,
      [ThinkingCategory.strategic]: 0.70,
      [ThinkingCategory.exploratory]: 0.30,
      [ThinkingCategory.reflective]: 0.50,
      [ThinkingCategory.social]: 0.25,
    },
  },
  {
    content:
      "新しいアイデアが浮かんだ。既存の枠を超えて、全く別のアプローチも試してみたい。ユーザーが本当に求めているものは何だろうと考えた。",
    scores: {
      [ThinkingCategory.analytical]: 0.30,
      [ThinkingCategory.strategic]: 0.45,
      [ThinkingCategory.exploratory]: 0.90,
      [ThinkingCategory.reflective]: 0.60,
      [ThinkingCategory.social]: 0.70,
    },
  },
  {
    content:
      "チームの動きを振り返った。自分の伝え方に課題があると気づいた。長期的な視点で関係構築をしていく必要がある。",
    scores: {
      [ThinkingCategory.analytical]: 0.55,
      [ThinkingCategory.strategic]: 0.65,
      [ThinkingCategory.exploratory]: 0.50,
      [ThinkingCategory.reflective]: 0.80,
      [ThinkingCategory.social]: 0.75,
    },
  },
];

async function main() {
  const user = await prisma.user.create({
    data: {
      email: "test@receptor.dev",
      name: "テストユーザー",
    },
  });

  for (const log of logs) {
    const thoughtLog = await prisma.thoughtLog.create({
      data: { userId: user.id, content: log.content },
    });

    const analysisResult = await prisma.analysisResult.create({
      data: { thoughtLogId: thoughtLog.id },
    });

    for (const [category, score] of Object.entries(log.scores)) {
      await prisma.analysisScore.create({
        data: {
          analysisResultId: analysisResult.id,
          category: category as ThinkingCategory,
          score,
        },
      });
    }
  }

  console.log("Seed完了: 1 user / 3 logs / 3 analysis results / 15 scores");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
