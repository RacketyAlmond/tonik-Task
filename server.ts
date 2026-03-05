import http from "http";
import { Server } from "socket.io";
import { pickSentence } from "./app/lib/game/sentences";
import { scoreRound } from "./app/lib/game/scoring";
import { countCorrectCharsForWord, generateWordQueue, randomWord } from "./app/lib/game/words";

type Mode = "sentences" | "words";

type SentencesRoundState = {
    roundId: string;
    sentence: string;
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
};

type WordsRoundState = {
    roundId: string;
    words: [string, string, string];
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
};

type SentencesPlayer = {
    id: string;
    name: string;
    typed: string;
    lastSeenAt: number;
};

type WordsPlayer = {
    id: string;
    name: string;
    typed: string;
    correctWords: number;
    committedWords: number;
    correctChars: number;
    totalChars: number;
    lastSeenAt: number;
};

type PublicSentencesPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
};

type PublicWordsPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
    correctWords: number;
    committedWords: number;
};

const PORT = Number(process.env.SOCKET_PORT ?? 3002);
const ROUND_MS = Number(process.env.ROUND_MS ?? 30_000);

function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp01(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function roomFor(mode: Mode) {
    return `mode:${mode}`;
}

class SentencesGame {
    round: SentencesRoundState;
    players: Map<string, SentencesPlayer>;

    constructor() {
        const now = Date.now();
        this.round = {
            roundId: uid(),
            sentence: pickSentence(0),
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: 0,
        };
        this.players = new Map();
    }

    ensurePlayer(id: string, name: string) {
        const now = Date.now();
        const existing = this.players.get(id);
        if (existing) {
            existing.name = name || existing.name;
            existing.lastSeenAt = now;
            return existing;
        }
        const p: SentencesPlayer = { id, name: name || "Player", typed: "", lastSeenAt: now };
        this.players.set(id, p);
        return p;
    }

    removePlayer(id: string) {
        this.players.delete(id);
    }

    setProgress(id: string, typed: string) {
        const p = this.players.get(id);
        if (!p) return;
        p.typed = typed;
        p.lastSeenAt = Date.now();
    }

    nextRound() {
        const now = Date.now();
        const nextIndex = this.round.roundIndex + 1;
        this.round = {
            roundId: uid(),
            sentence: pickSentence(nextIndex),
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: nextIndex,
        };
        for (const p of this.players.values()) {
            p.typed = "";
        }
    }

    shouldRotate(now: number) {
        return now >= this.round.roundEndsAt;
    }

    toPublicState(now: number) {
        const players: PublicSentencesPlayer[] = [];
        for (const p of this.players.values()) {
            const scored = scoreRound({
                sentence: this.round.sentence,
                typed: p.typed,
                roundStartedAt: this.round.roundStartedAt,
                now,
            });
            players.push({
                id: p.id,
                name: p.name,
                liveProgress: p.typed,
                wpm: scored.wpm,
                accuracy: clamp01(scored.accuracy),
            });
        }
        players.sort((a, b) => b.wpm - a.wpm);
        return {
            mode: "sentences" as const,
            round: this.round,
            players,
            serverNow: now,
        };
    }
}

class WordsGame {
    round: WordsRoundState;
    players: Map<string, WordsPlayer>;

    constructor() {
        const now = Date.now();
        const q = generateWordQueue(3) as [string, string, string];
        this.round = {
            roundId: uid(),
            words: q,
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: 0,
        };
        this.players = new Map();
    }

    ensurePlayer(id: string, name: string) {
        const now = Date.now();
        const existing = this.players.get(id);
        if (existing) {
            existing.name = name || existing.name;
            existing.lastSeenAt = now;
            return existing;
        }
        const p: WordsPlayer = {
            id,
            name: name || "Player",
            typed: "",
            correctWords: 0,
            committedWords: 0,
            correctChars: 0,
            totalChars: 0,
            lastSeenAt: now,
        };
        this.players.set(id, p);
        return p;
    }

    removePlayer(id: string) {
        this.players.delete(id);
    }

    setProgress(id: string, typed: string) {
        const p = this.players.get(id);
        if (!p) return;
        p.typed = typed;
        p.lastSeenAt = Date.now();
    }

    commit(id: string) {
        const p = this.players.get(id);
        if (!p) return;

        const target = (this.round.words[0] ?? "").toLowerCase();
        const typedWord = p.typed.trim().toLowerCase();

        const total = target.length;
        const correct = countCorrectCharsForWord(target, typedWord);

        p.totalChars += total;
        p.correctChars += correct;
        p.committedWords += 1;
        if (typedWord === target) p.correctWords += 1;

        p.typed = "";

        const next1 = this.round.words[1];
        const next2 = this.round.words[2];
        const next3 = randomWord();
        this.round.words = [next1, next2, next3];
    }

    nextRound() {
        const now = Date.now();
        const nextIndex = this.round.roundIndex + 1;
        const q = generateWordQueue(3) as [string, string, string];
        this.round = {
            roundId: uid(),
            words: q,
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: nextIndex,
        };
        for (const p of this.players.values()) {
            p.typed = "";
            p.correctWords = 0;
            p.committedWords = 0;
            p.correctChars = 0;
            p.totalChars = 0;
        }
    }

    shouldRotate(now: number) {
        return now >= this.round.roundEndsAt;
    }

    toPublicState(now: number) {
        const players: PublicWordsPlayer[] = [];
        for (const p of this.players.values()) {
            const elapsedMsRaw = now - this.round.roundStartedAt;
            const elapsedMs = Math.max(3_000, elapsedMsRaw);
            const minutes = elapsedMs / 60_000;

            const wpm = minutes > 0 ? p.correctWords / minutes : 0;
            const accuracy = p.totalChars === 0 ? 1 : p.correctChars / p.totalChars;

            players.push({
                id: p.id,
                name: p.name,
                liveProgress: p.typed,
                wpm,
                accuracy: clamp01(accuracy),
                correctWords: p.correctWords,
                committedWords: p.committedWords,
            });
        }
        players.sort((a, b) => b.wpm - a.wpm);
        return {
            mode: "words" as const,
            round: this.round,
            players,
            serverNow: now,
        };
    }
}

const sentencesGame = new SentencesGame();
const wordsGame = new WordsGame();

const httpServer = http.createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
});

const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true,
    },
});

io.on("connection", (socket) => {
    socket.on(
        "join",
        (
            payload: { playerId: string; name: string; mode: Mode },
            ack?: (state: unknown) => void
        ) => {
            const playerId = String(payload?.playerId ?? "");
            const name = String(payload?.name ?? "");
            const mode = (payload?.mode ?? "sentences") as Mode;

            if (!playerId) return;
            if (mode !== "sentences" && mode !== "words") return;

            socket.data.playerId = playerId;
            socket.data.mode = mode;

            socket.join(roomFor(mode));

            const now = Date.now();

            if (mode === "sentences") {
                sentencesGame.ensurePlayer(playerId, name);
                const snap = sentencesGame.toPublicState(now);
                if (ack) ack(snap);
                io.to(roomFor("sentences")).emit("state", snap);
                return;
            }

            wordsGame.ensurePlayer(playerId, name);
            const snap = wordsGame.toPublicState(now);
            if (ack) ack(snap);
            io.to(roomFor("words")).emit("state", snap);
        }
    );

    socket.on("progress", (payload: { typed: string }) => {
        const playerId = socket.data.playerId as string | undefined;
        const mode = socket.data.mode as Mode | undefined;
        if (!playerId || !mode) return;

        const typed = String(payload?.typed ?? "");

        if (mode === "sentences") {
            sentencesGame.setProgress(playerId, typed);
            return;
        }

        wordsGame.setProgress(playerId, typed);
    });

    socket.on("commit", () => {
        const playerId = socket.data.playerId as string | undefined;
        const mode = socket.data.mode as Mode | undefined;
        if (!playerId || mode !== "words") return;

        wordsGame.commit(playerId);
        const now = Date.now();
        io.to(roomFor("words")).emit("state", wordsGame.toPublicState(now));
    });

    socket.on("disconnect", () => {
        const playerId = socket.data.playerId as string | undefined;
        const mode = socket.data.mode as Mode | undefined;
        if (!playerId || !mode) return;

        const now = Date.now();

        if (mode === "sentences") {
            sentencesGame.removePlayer(playerId);
            io.to(roomFor("sentences")).emit("state", sentencesGame.toPublicState(now));
            return;
        }

        wordsGame.removePlayer(playerId);
        io.to(roomFor("words")).emit("state", wordsGame.toPublicState(now));
    });
});

setInterval(() => {
    const now = Date.now();

    if (sentencesGame.shouldRotate(now)) {
        sentencesGame.nextRound();
        io.to(roomFor("sentences")).emit("state", sentencesGame.toPublicState(now));
    }

    if (wordsGame.shouldRotate(now)) {
        wordsGame.nextRound();
        io.to(roomFor("words")).emit("state", wordsGame.toPublicState(now));
    }
}, 100);

setInterval(() => {
    const now = Date.now();
    io.to(roomFor("sentences")).emit("state", sentencesGame.toPublicState(now));
    io.to(roomFor("words")).emit("state", wordsGame.toPublicState(now));
}, 200);

httpServer.listen(PORT, () => {
    process.stdout.write(`socket.io on http://localhost:${PORT}\n`);
});