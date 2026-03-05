// lib/game/scoring.ts

export type ScoreInput = {
    sentence: string;
    typed: string;
    roundStartedAt: number; // ms epoch
    now: number; // ms epoch
};

export type ScoreOutput = {
    progress: string;
    typedChars: number;
    correctChars: number;
    accuracy: number; // 0..1

    correctWords: number;
    wpm: number;
};

function clamp01(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

/**
 * Counts position-wise correct characters between typed and sentence.
 */
export function countCorrectChars(sentence: string, typed: string): number {
    const len = Math.min(sentence.length, typed.length);
    let correct = 0;
    for (let i = 0; i < len; i++) {
        if (typed[i] === sentence[i]) correct++;
    }
    return correct;
}

/**
 * Count fully completed words that match exactly.
 * "Completed" means the user committed the word boundary:
 * - for non-last words: typed includes the trailing space
 * - for last word: typed reached the end of the word (end-of-sentence)
 */
export function countCorrectCompletedWords(sentence: string, typed: string): number {
    const sentenceWords = sentence.split(" ");
    const typedWords = typed.split(" ");

    let correct = 0;

    for (let i = 0; i < sentenceWords.length; i++) {
        const sentenceWord = sentenceWords[i]!;
        const typedWord = typedWords[i] ?? "";

        // Compute the start index of this word in the full sentence string
        // Example sentence "a bb ccc"
        // word 0 start 0, word 1 start 2, word 2 start 5
        const prefix = sentenceWords.slice(0, i).join(" ");
        const wordStart = prefix.length + (i === 0 ? 0 : 1);
        const wordEndExclusive = wordStart + sentenceWord.length;

        const isLastWord = i === sentenceWords.length - 1;

        const completed = !isLastWord
            ? typed.length >= wordEndExclusive + 1 // includes trailing space
            : typed.length >= wordEndExclusive; // end of last word is enough

        if (!completed) break;

        if (typedWord === sentenceWord) correct++;
    }

    return correct;
}

/**
 * Computes accuracy & WPM for the current round.
 * Accuracy: correctChars / sentence.length (document this choice).
 * WPM: correct completed words per minute (words with errors do not count).
 */
export function scoreRound(input: ScoreInput): ScoreOutput {
    const { sentence, typed, roundStartedAt, now } = input;

    const progress = typed;
    const typedCapped = typed.slice(0, sentence.length);

    const typedChars = Math.min(sentence.length, typedCapped.length);
    const correctChars = countCorrectChars(sentence, typedCapped);

    const accuracy = clamp01(sentence.length === 0 ? 0 : correctChars / sentence.length);

    const correctWords = countCorrectCompletedWords(sentence, typedCapped);

    // Avoid crazy WPM in the first seconds
    const elapsedMsRaw = now - roundStartedAt;
    const elapsedMs = Math.max(3_000, elapsedMsRaw);
    const elapsedMinutes = elapsedMs / 60_000;

    const wpm = elapsedMinutes > 0 ? correctWords / elapsedMinutes : 0;

    return {
        progress,
        typedChars,
        correctChars,
        accuracy,
        correctWords,
        wpm: Number.isFinite(wpm) ? Math.max(0, wpm) : 0,
    };
}