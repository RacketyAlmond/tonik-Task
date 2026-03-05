// lib/game/scoring.test.ts
import { describe, expect, it } from "vitest";
import { countCorrectChars, countCorrectCompletedWords, scoreRound } from "./scoring";

describe("scoring", () => {
    it("counts correct chars position-wise", () => {
        expect(countCorrectChars("abc", "abc")).toBe(3);
        expect(countCorrectChars("abc", "axc")).toBe(2);
        expect(countCorrectChars("abc", "a")).toBe(1);
    });

    it("counts correct completed words only", () => {
        const sentence = "hello world";
        expect(countCorrectCompletedWords(sentence, "hello")).toBe(0); // not completed (missing space + rest)
        expect(countCorrectCompletedWords(sentence, "hello ")).toBe(1); // completed word boundary at 5
        expect(countCorrectCompletedWords(sentence, "hello wor")).toBe(1);
        expect(countCorrectCompletedWords(sentence, "hello world")).toBe(2);
        expect(countCorrectCompletedWords(sentence, "hello wurld")).toBe(1);
    });

    it("computes wpm with a minimum elapsed clamp", () => {
        const out = scoreRound({
            sentence: "one two three",
            typed: "one ",
            roundStartedAt: 0,
            now: 100, // would be too small without clamp
        });
        expect(out.correctWords).toBe(1);
        expect(out.wpm).toBeGreaterThan(0);
    });
});