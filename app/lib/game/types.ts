// lib/game/types.ts

export type PlayerId = string;

export type RoundState = {
    roundId: string;
    sentence: string;
    roundStartedAt: number; // ms epoch
    roundEndsAt: number; // ms epoch
};

export type PlayerRoundMetrics = {
    // Raw
    progress: string; // what the player currently typed
    typedChars: number; // capped to sentence length
    correctChars: number; // position-wise correct chars
    correctWords: number; // fully completed words that match exactly

    // Derived
    accuracy: number; // 0..1
    wpm: number; // correct words per minute
};

export type PlayerState = {
    id: PlayerId;
    name: string;
    connectedAt: number;
    lastSeenAt: number;

    round: PlayerRoundMetrics;
};

export type PublicPlayerRow = {
    id: PlayerId;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
};