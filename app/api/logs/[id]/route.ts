import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { calculateAgilityScore } from "@/app/lib/agility-logic";
import type { AgilityResponse } from "@/app/types/api";

// ユーザーの全ログスコアを集約して Agility Score を算出するヘルパー
const getAgilityScore = async (userId: string): Promise<AgilityResponse> => {
    const allResults = await prisma.analysisScore.findMany({
        where: { analysis: { log: { userId } } },
        include: { analysis: { include: { log: true } } },
    });

    // ログIDをキーに、各カテゴリのスコアをマップ化
    const scoresByLog = allResults.reduce((acc, s) => {
        const logId = s.analysis.log.id;
        if (!acc[logId]) acc[logId] = { analytical: 0, strategic: 0, exploratory: 0, reflective: 0, social: 0 };
        acc[logId][s.category as keyof typeof acc[typeof logId]] = s.score;
        return acc;
    }, {} as Record<string, { analytical: number; strategic: number; exploratory: number; reflective: number; social: number }>);

    // ログ単位のスコアセットを渡して Agility Score を計算
    return calculateAgilityScore(Object.values(scoresByLog));
};

// ログのテキストを更新し、更新後の Agility Score を返す
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await req.json();

    // userId を条件に含めて他ユーザーのログを更新できないよう制限
    await prisma.thoughtLog.update({
        where: { id, userId: session.user.id },
        data: { content },
    });

    const agility = await getAgilityScore(session.user.id);
    return NextResponse.json<AgilityResponse>(agility);
};

// ログを削除し、削除後の Agility Score を返す
export const DELETE = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // userId を条件に含めて他ユーザーのログを削除できないよう制限
    await prisma.thoughtLog.delete({
        where: { id, userId: session.user.id },
    });

    const agility = await getAgilityScore(session.user.id);
    return NextResponse.json<AgilityResponse>(agility);
};
