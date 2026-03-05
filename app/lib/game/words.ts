export const WORDS = [
    "apple",
    "river",
    "signal",
    "shadow",
    "planet",
    "window",
    "market",
    "yellow",
    "future",
    "silver",
    "coffee",
    "garden",
    "memory",
    "rocket",
    "castle",
    "forest",
    "object",
    "motion",
    "bright",
    "fabric",
    "puzzle",
    "butter",
    "camera",
    "finger",
    "energy",
    "secret",
    "moment",
    "summer",
    "winter",
    "circle",
];

export function countCorrectCharsForWord(target: string, typed: string) {
    const a = target;
    const b = typed;
    const n = Math.min(a.length, b.length);
    let correct = 0;
    for (let i = 0; i < n; i++) {
        if (a[i] === b[i]) correct += 1;
    }
    return correct;
}