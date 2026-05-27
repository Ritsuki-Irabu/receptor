import { GoogleGenerativeAI } from "@google/generative-ai";

export type CategoryScores = {
    analytical: number;
    strategic: number;
    exploratory: number;
    reflective: number;
    social: number;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 思考ログを Gemini API に送り、5カテゴリのスコア（0.0〜1.0）を JSON で受け取る
export const analyzeThoughtLog = async (content: string): Promise<CategoryScores> => {
    const prompt = `
あなたは思考分析の専門家です。以下の思考ログを読み、5つの思考カテゴリそれぞれのスコアを0.0〜1.0で評価してください。

## 思考カテゴリの定義

- Analytical（論理思考）: 原因分析・問題分解・根拠に基づく判断。キーワード例：分析、原因、構造、根拠、分解、論理
- Strategic（戦略思考）: 長期視点・目標設計・全体最適。キーワード例：将来、戦略、計画、目標、ロードマップ
- Exploratory（探索思考）: 未知への好奇心・仮説検証・アイデア創出。キーワード例：試す、可能性、アイデア、仮説、挑戦
- Reflective（内省思考）: 自己客観化・振り返り・気づきの言語化。キーワード例：振り返る、学んだ、気づき、自己分析
- Social（社会思考）: 他者理解・共感・チーム協働。キーワード例：チーム、相手、協力、共感、関係

## 評価基準
- 0.0: そのカテゴリの思考が全く見られない
- 0.5: そのカテゴリの思考が部分的に見られる
- 1.0: そのカテゴリの思考が強く・明確に表れている

## 思考ログ
${content}

## 出力形式
以下のJSONのみを返してください。説明文・前置き・コードブロックは不要です。
{"analytical":0.0,"strategic":0.0,"exploratory":0.0,"reflective":0.0,"social":0.0}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Gemini がコードブロック（```json）付きで返す場合があるため除去してパース
    const json = text.replace(/```json|```/g, "").trim();
    return JSON.parse(json) as CategoryScores;
};
