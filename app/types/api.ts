export type PostLogRequest = {
    content: string;
};

export type PostLogResponse = {
    success: boolean;
    logId: string;
};

export type CategoryScores = {
    analytical: number;
    strategic: number;
    exploratory: number;
    reflective: number;
    social: number;
};

export type LogItem = {
    id: string;
    content: string;
    createdAt: string;
    scores: CategoryScores | null;
};

export type GetLogsResponse = {
    logs: LogItem[];
};

export type AgilityResponse = {
    score: number;
    level: "None" | "Beginner" | "Active";
    isEmpty: boolean;
};

export type PortfolioResponse = {
    agility: AgilityResponse;
    categoryAverages: CategoryScores;
    totalLogs: number;
};
