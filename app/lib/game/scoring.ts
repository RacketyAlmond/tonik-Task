
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


export function countCorrectChars(sentence: string, typed: string): number {
    const len = Math.min(sentence.length, typed.length);
    let correct = 0;
    for (let i = 0; i < len; i++) {
        if (typed[i] === sentence[i]) correct++;
    }
    return correct;
}


export function countCorrectCompletedWords(sentence: string, typed: string): number {
    const sentenceWords = sentence.split(" ");
    const typedWords = typed.split(" ");

    let correct = 0;

    for (let i = 0; i < sentenceWords.length; i++) {
        const sentenceWord = sentenceWords[i]!;
        const typedWord = typedWords[i] ?? "";
        const prefix = sentenceWords.slice(0, i).join(" ");
        const wordStart = prefix.length + (i === 0 ? 0 : 1);
        const wordEndExclusive = wordStart + sentenceWord.length;

        const isLastWord = i === sentenceWords.length - 1;

        const completed = !isLastWord
            ? typed.length >= wordEndExclusive + 1
            : typed.length >= wordEndExclusive;

        if (!completed) break;

        if (typedWord === sentenceWord) correct++;
    }

    return correct;
}

export function scoreRound(input: ScoreInput): ScoreOutput {
    const { sentence, typed, roundStartedAt, now } = input;

    const progress = typed;
    const typedCapped = typed.slice(0, sentence.length);

    const typedChars = Math.min(sentence.length, typedCapped.length);
    const correctChars = countCorrectChars(sentence, typedCapped);

    const accuracy = clamp01(sentence.length === 0 ? 0 : correctChars / sentence.length);

    const correctWords = countCorrectCompletedWords(sentence, typedCapped);

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