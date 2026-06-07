import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { calculateAgilityScore } from "@/app/lib/agility-logic";
import type { PortfolioResponse, CategoryScores } from "@/app/types/api";

// ポートフォリオデータを返す（Agility Score・カテゴリ平均・総ログ数）
export const GET = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allScores = await prisma.analysisScore.findMany({
        where: { analysis: { log: { userId: session.user.id } } },
        include: { analysis: { include: { log: true } } },
    });

    // ログIDを Set で重複排除してユニークなログ数をカウント
    type ScoreItem = typeof allScores[number];
    const totalLogs = new Set(allScores.map((s: ScoreItem) => s.analysis.log.id)).size;

    // ログIDをキーに、カテゴリスコアをマップ化
    const scoresByLog = allScores.reduce((acc: Record<string, CategoryScores>, s: ScoreItem) => {
        const logId = s.analysis.log.id;
        if (!acc[logId]) acc[logId] = { analytical: 0, strategic: 0, exploratory: 0, reflective: 0, social: 0 };
        acc[logId][s.category as keyof CategoryScores] = s.score;
        return acc;
    }, {} as Record<string, CategoryScores>);

    const scoreSets: CategoryScores[] = Object.values(scoresByLog);

    const categories: (keyof CategoryScores)[] = [
        "analytical", "strategic", "exploratory", "reflective", "social"
    ];

    // 各カテゴリの全ログ平均を計算（ログが0件のときは0でフォールバック）
    const n = scoreSets.length;
    const avg = (cat: keyof CategoryScores) =>
        n > 0 ? scoreSets.reduce((sum, s) => sum + s[cat], 0) / n : 0;
    const categoryAverages: CategoryScores = {
        analytical: avg("analytical"),
        strategic: avg("strategic"),
        exploratory: avg("exploratory"),
        reflective: avg("reflective"),
        social: avg("social"),
    };

    // ログ単位のスコアセットから Agility Score を算出
    const agility = calculateAgilityScore(scoreSets);

    return NextResponse.json<PortfolioResponse>({
        agility,
        categoryAverages,
        totalLogs,
    });
};
