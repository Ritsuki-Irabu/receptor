import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { calculateAgilityScore } from "@/app/lib/agility-logic";
import type { PortfolioResponse, CategoryScores } from "@/app/types/api";

export const GET = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allScores = await prisma.analysisScore.findMany({
        where: { analysis: { log: { userId: session.user.id } } },
        include: { analysis: { include: { log: true } } },
    });

    const totalLogs = new Set(allScores.map((s) => s.analysis.log.id)).size;

    const scoresByLog = allScores.reduce((acc, s) => {
        const logId = s.analysis.log.id;
        if (!acc[logId]) acc[logId] = { analytical: 0, strategic: 0, exploratory: 0, reflective: 0, social: 0 };
        acc[logId][s.category as keyof CategoryScores] = s.score;
        return acc;
    }, {} as Record<string, CategoryScores>);

    const scoreSets = Object.values(scoresByLog);

    const categories: (keyof CategoryScores)[] = [
        "analytical", "strategic", "exploratory", "reflective", "social"
    ];

    const categoryAverages = categories.reduce((acc, cat) => {
        acc[cat] = scoreSets.length > 0
            ? scoreSets.reduce((sum, s) => sum + s[cat], 0) / scoreSets.length
            : 0;
        return acc;
    }, {} as CategoryScores);

    const agility = calculateAgilityScore(scoreSets);

    return NextResponse.json<PortfolioResponse>({
        agility,
        categoryAverages,
        totalLogs,
    });
};
