// lib/game/sentences.ts

export const SENTENCES: string[] = [
    "The quick brown fox jumps over the lazy dog.",
    "Simplicity is the ultimate sophistication.",
    "Typing fast is good, typing accurately is better.",
    "Make it work, make it right, make it fast.",
    "Small steps every day lead to big results.",
    "A good developer writes code for humans first.",
    "Measure twice, cut once, then refactor.",
    "Great software is built with feedback loops.",
    "Stay curious, keep learning, ship often.",
    "A clear README can save hours of guessing.",
];

export function pickSentence(roundIndex: number): string {
    // Deterministic cycle so reviewers get consistent behavior
    return SENTENCES[roundIndex % SENTENCES.length]!;
}