import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { analyzeThoughtLog } from "@/app/lib/gemini";
import type { PostLogRequest, PostLogResponse, GetLogsResponse } from "@/app/types/api";

// 思考ログを保存し Gemini で分析してスコアを DB に記録する
export const POST = async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content }: PostLogRequest = await req.json();

    // 入力テキストを ThoughtLog として保存
    const log = await prisma.thoughtLog.create({
        data: {
            userId: session.user.id,
            content,
        },
    });

    // Gemini API で5カテゴリスコアを取得
    const scores = await analyzeThoughtLog(content);

    // AnalysisResult と AnalysisScore をネストで一括作成
    const analysisResult = await prisma.analysisResult.create({
        data: {
            thoughtLogId: log.id,
            scores: {
                create: Object.entries(scores).map(([category, score]) => ({
                    category: category as any,
                    score,
                })),
            },
        },
    });

    return NextResponse.json<PostLogResponse>({
        success: true,
        logId: log.id,
    });
};

// ログ一覧を新しい順に取得し、各ログのカテゴリスコアを整形して返す
export const GET = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 新しい順で全ログを取得し、分析結果・スコアを JOIN
    const logs = await prisma.thoughtLog.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            analysisResult: {
                include: { scores: true },
            },
        },
    });

    // analysisResult が null（未分析）の場合は scores を null のまま返す
    const response: GetLogsResponse = {
        logs: logs.map((log: typeof logs[number]) => ({
            id: log.id,
            content: log.content,
            createdAt: log.createdAt.toISOString(),
            scores: log.analysisResult
                ? {
                    analytical: log.analysisResult.scores.find((s: { category: string; score: number }) => s.category === "analytical")?.score ?? 0,
                    strategic: log.analysisResult.scores.find((s: { category: string; score: number }) => s.category === "strategic")?.score ?? 0,
                    exploratory: log.analysisResult.scores.find((s: { category: string; score: number }) => s.category === "exploratory")?.score ?? 0,
                    reflective: log.analysisResult.scores.find((s: { category: string; score: number }) => s.category === "reflective")?.score ?? 0,
                    social: log.analysisResult.scores.find((s: { category: string; score: number }) => s.category === "social")?.score ?? 0,
                }
                : null,
        })),
    };

    return NextResponse.json(response);
};