import "dotenv/config";
import { analyzeThoughtLog } from "../app/lib/gemini";

(async () => {
    const result = await analyzeThoughtLog("今日はチームの問題点を分析して、来週の戦略を考えた。");
    console.log(result);
})();
