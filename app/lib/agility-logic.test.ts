import { describe, it, expect } from "vitest";
import { calculateAgilityScore } from "./agility-logic";

describe("calculateAgilityScore", () => {

    it("0件のとき score=0, isEmpty=true を返す", () => {
        const result = calculateAgilityScore([]);
        expect(result.score).toBe(0);
        expect(result.isEmpty).toBe(true);
        expect(result.level).toBe("None");
    });

    it("1件のとき level=Beginner を返す", () => {
        const result = calculateAgilityScore([
            { analytical: 0.8, strategic: 0.7, exploratory: 0.6, reflective: 0.7, social: 0.6 },
        ]);
        expect(result.level).toBe("Beginner");
        expect(result.isEmpty).toBe(false);
    });

    it("複数件のとき level=Active を返す", () => {
        const result = calculateAgilityScore([
            { analytical: 0.8, strategic: 0.7, exploratory: 0.6, reflective: 0.7, social: 0.6 },
            { analytical: 0.5, strategic: 0.6, exploratory: 0.8, reflective: 0.4, social: 0.7 },
        ]);
        expect(result.level).toBe("Active");
        expect(result.isEmpty).toBe(false);
    });

    it("score は 0〜100 の範囲に収まる", () => {
        const result = calculateAgilityScore([
            { analytical: 1.0, strategic: 1.0, exploratory: 1.0, reflective: 1.0, social: 1.0 },
            { analytical: 1.0, strategic: 1.0, exploratory: 1.0, reflective: 1.0, social: 1.0 },
        ]);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
    });

    it("全スコアが0のとき score=0 を返す", () => {
        const result = calculateAgilityScore([
            { analytical: 0, strategic: 0, exploratory: 0, reflective: 0, social: 0 },
            { analytical: 0, strategic: 0, exploratory: 0, reflective: 0, social: 0 },
        ]);
        expect(result.score).toBe(0);
    });

});
