/**
 * Agility Score 算出アルゴリズム
 * 0件・1件・削除後など、あらゆる状態変化に対応
 */
export type ScoreSet = {
    analytical: number;
    strategic: number;
    exploratory: number;
    reflective: number;
    social: number;
};


// ① 多様性（diversity）- 1件時
// 1件のログの5カテゴリスコアが「高くてバランスが取れているか」を測る
const calculateInitialDiversity = (score: ScoreSet): number => {
  const categories: (keyof ScoreSet)[] = [
    "analytical", "strategic", "exploratory", "reflective", "social"
  ];

  // 1件分の5カテゴリの値を配列に変換
  const values = categories.map((cat) => score[cat]);

  // 5カテゴリの平均（全体的な高さ）
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  // 標準偏差（カテゴリ間の偏り）
  const variance = values.reduce((sum, v) =>
    sum + Math.pow(v - mean, 2), 0
  ) / values.length;
  const stdDev = Math.sqrt(variance);

  // 偏りをバランス度に反転（偏りが少ない → balance が高い）
  const balance = 1 - Math.min(stdDev * 2, 1);

  // 高さ × バランス度 を返す
  return Math.min(mean * balance, 1);
};

//① 多様性（diversity）
//1件のログ内でスコアが偏っていないか。
const calculateAverageDiversity = (scores: ScoreSet[]): number => {
  const categories: (keyof ScoreSet)[] = [
    "analytical", "strategic", "exploratory", "reflective", "social"
  ];

  const categoryAvgs = categories.map((cat) =>
    scores.reduce((sum, s) => sum + s[cat], 0) / scores.length
  );

  const mean = categoryAvgs.reduce((sum, v) => sum + v, 0) / categoryAvgs.length;

  const variance = categoryAvgs.reduce((sum, v) =>
    sum + Math.pow(v - mean, 2), 0
  ) / categoryAvgs.length;
  const stdDev = Math.sqrt(variance);

  const balance = 1 - Math.min(stdDev * 2, 1);

  return Math.min(mean * balance, 1);
};

// ② 更新度（update）
// 最新のログと過去の平均がどれだけ違うか。
const calculateRecentChange = (scores: ScoreSet[]): number => {
    const categories: (keyof ScoreSet)[] = [
        "analytical", "strategic", "exploratory", "reflective", "social"
    ];
    // 配列の先頭が最新ログ（API では降順で渡される）
    const latest = scores[0];
    const past = scores.slice(1);

    const pastAvg = categories.reduce((acc, cat) => {
        acc[cat] = past.reduce((sum, s) => sum + s[cat], 0) / past.length;
        return acc;
    }, {} as ScoreSet);

    const diff = categories.reduce((sum, cat) => {
        return sum + Math.abs(latest[cat] - pastAvg[cat]);
    }, 0);

    return Math.min(diff / categories.length, 1);
};

//③ 領域数（range）
//積み重ねて0.5を超えたカテゴリが何個あるか。
const calculateCategoryCoverage = (scores: ScoreSet[]): number => {
    const categories: (keyof ScoreSet)[] = [
        "analytical", "strategic", "exploratory", "reflective", "social"
    ];
    const active = categories.filter((cat) =>
        scores.some((s) => s[cat] > 0.5)
    );
    return active.length / categories.length;
};

export function calculateAgilityScore(allRecentScores: ScoreSet[]) {
    // --- 1. 0件（データなし）のハンドリング ---
    if (!allRecentScores || allRecentScores.length === 0) {
        return {
            score: 0,
            level: "None",
            message: "思考ログを投稿して分析を開始しましょう。",
            isEmpty: true
        };
    }

    // --- 2. 1件（初回）のハンドリング ---
    if (allRecentScores.length === 1) {
        // 5角形の面積やカテゴリの偏りから初期多様性を算出
        const diversity = calculateInitialDiversity(allRecentScores[0]);
        return {
            score: Math.round(diversity * 100),
            level: "Beginner",
            isEmpty: false
        };
    }

    // --- 3. 通常計算（複数件） ---
    const diversity = calculateAverageDiversity(allRecentScores); // 面積・バランス
    const update = calculateRecentChange(allRecentScores);       // 変化量
    const range = calculateCategoryCoverage(allRecentScores);    // カテゴリ網羅率

    const total = (diversity * 0.4) + (update * 0.3) + (range * 0.3);

    return {
        score: Math.min(100, Math.max(0, Math.round(total * 100))),
        level: "Active",
        isEmpty: false
    };
}