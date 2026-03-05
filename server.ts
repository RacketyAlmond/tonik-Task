import http from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import { pickSentence } from "./app/lib/game/sentences";
import { scoreRound } from "./app/lib/game/scoring";
import { WORDS, countCorrectCharsForWord } from "./app/lib/game/words";

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
    wordIds: number[];
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
    cursor: number;
    correctWords: number;
    committedWords: number;
    correctChars: number;
    totalChars: number;
    lastSeenAt: number;
};

type LeaderboardRow = {
    name: string;
    bestSentences: number;
    bestWords: number;
};

type LeaderboardState = {
    sentencesTop: LeaderboardRow[];
    wordsTop: LeaderboardRow[];
};

type PublicSentencesPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
    bestSentences: number;
    bestWords: number;
};

type PublicWordsPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
    correctWords: number;
    committedWords: number;
    cursor: number;
    current: string;
    next: string;
    next2: string;
    bestSentences: number;
    bestWords: number;
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

const db = new Database("leaderboard.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    name TEXT PRIMARY KEY,
    best_sentences REAL NOT NULL DEFAULT 0,
    best_words REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO players(name, best_sentences, best_words, updated_at)
  VALUES (@name, @best_sentences, @best_words, @updated_at)
  ON CONFLICT(name) DO UPDATE SET
    best_sentences = MAX(players.best_sentences, excluded.best_sentences),
    best_words = MAX(players.best_words, excluded.best_words),
    updated_at = excluded.updated_at
`);

const getBestStmt = db.prepare(`SELECT best_sentences, best_words FROM players WHERE name = ?`);
const topSentencesStmt = db.prepare(`
  SELECT name, best_sentences, best_words
  FROM players
  ORDER BY best_sentences DESC, updated_at DESC
  LIMIT 10
`);
const topWordsStmt = db.prepare(`
  SELECT name, best_sentences, best_words
  FROM players
  ORDER BY best_words DESC, updated_at DESC
  LIMIT 10
`);

function getLeaderboard(): LeaderboardState {
    const s = topSentencesStmt.all().map((r: any) => ({
        name: r.name as string,
        bestSentences: Number(r.best_sentences ?? 0),
        bestWords: Number(r.best_words ?? 0),
    }));
    const w = topWordsStmt.all().map((r: any) => ({
        name: r.name as string,
        bestSentences: Number(r.best_sentences ?? 0),
        bestWords: Number(r.best_words ?? 0),
    }));
    return { sentencesTop: s, wordsTop: w };
}

function getBestForName(name: string) {
    const row = getBestStmt.get(name) as any;
    return {
        bestSentences: Number(row?.best_sentences ?? 0),
        bestWords: Number(row?.best_words ?? 0),
    };
}

function updateBest(name: string, patch: Partial<{ bestSentences: number; bestWords: number }>) {
    const current = getBestForName(name);
    const next = {
        name,
        best_sentences: Math.max(current.bestSentences, patch.bestSentences ?? 0),
        best_words: Math.max(current.bestWords, patch.bestWords ?? 0),
        updated_at: Date.now(),
    };
    upsertStmt.run(next);
    return {
        bestSentences: next.best_sentences,
        bestWords: next.best_words,
    };
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

    shouldRotate(now: number) {
        return now >= this.round.roundEndsAt;
    }

    finalizeRound(now: number) {
        for (const p of this.players.values()) {
            const scored = scoreRound({
                sentence: this.round.sentence,
                typed: p.typed,
                roundStartedAt: this.round.roundStartedAt,
                now,
            });
            updateBest(p.name, { bestSentences: scored.wpm });
        }
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
        for (const p of this.players.values()) p.typed = "";
    }

    toPublicState(now: number) {
        const lb = getLeaderboard();
        const players: PublicSentencesPlayer[] = [];
        for (const p of this.players.values()) {
            const scored = scoreRound({
                sentence: this.round.sentence,
                typed: p.typed,
                roundStartedAt: this.round.roundStartedAt,
                now,
            });
            const best = getBestForName(p.name);
            players.push({
                id: p.id,
                name: p.name,
                liveProgress: p.typed,
                wpm: scored.wpm,
                accuracy: clamp01(scored.accuracy),
                bestSentences: best.bestSentences,
                bestWords: best.bestWords,
            });
        }
        players.sort((a, b) => b.wpm - a.wpm);
        return { mode: "sentences" as const, round: this.round, players, serverNow: now, leaderboard: lb };
    }
}

class WordsGame {
    round: WordsRoundState;
    players: Map<string, WordsPlayer>;

    constructor() {
        const now = Date.now();
        this.round = {
            roundId: uid(),
            wordIds: this.generateWordIds(200),
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: 0,
        };
        this.players = new Map();
    }

    generateWordIds(count: number) {
        const ids: number[] = [];
        const n = WORDS.length;
        const take = Math.max(3, count);
        for (let i = 0; i < take; i++) ids.push(Math.floor(Math.random() * n));
        return ids;
    }

    wordAt(cursor: number) {
        const ids = this.round.wordIds;
        const n = ids.length;
        if (n === 0) return "";
        const safe = Math.max(0, cursor);
        const id = ids[safe % n] ?? 0;
        return WORDS[id] ?? "";
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
            cursor: 0,
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

        const target = this.wordAt(p.cursor).toLowerCase();
        const typedWord = p.typed.trim().toLowerCase();

        const total = target.length;
        const correct = countCorrectCharsForWord(target, typedWord);

        p.totalChars += total;
        p.correctChars += correct;
        p.committedWords += 1;
        if (typedWord === target) p.correctWords += 1;

        p.typed = "";
        p.cursor += 1;
    }

    shouldRotate(now: number) {
        return now >= this.round.roundEndsAt;
    }

    finalizeRound(now: number) {
        for (const p of this.players.values()) {
            const elapsedMsRaw = now - this.round.roundStartedAt;
            const elapsedMs = Math.max(3_000, elapsedMsRaw);
            const minutes = elapsedMs / 60_000;
            const wpm = minutes > 0 ? p.correctWords / minutes : 0;
            updateBest(p.name, { bestWords: wpm });
        }
    }

    nextRound() {
        const now = Date.now();
        const nextIndex = this.round.roundIndex + 1;
        this.round = {
            roundId: uid(),
            wordIds: this.generateWordIds(200),
            roundStartedAt: now,
            roundEndsAt: now + ROUND_MS,
            roundIndex: nextIndex,
        };
        for (const p of this.players.values()) {
            p.typed = "";
            p.cursor = 0;
            p.correctWords = 0;
            p.committedWords = 0;
            p.correctChars = 0;
            p.totalChars = 0;
        }
    }

    toPublicState(now: number) {
        const lb = getLeaderboard();
        const players: PublicWordsPlayer[] = [];
        for (const p of this.players.values()) {
            const elapsedMsRaw = now - this.round.roundStartedAt;
            const elapsedMs = Math.max(3_000, elapsedMsRaw);
            const minutes = elapsedMs / 60_000;

            const wpm = minutes > 0 ? p.correctWords / minutes : 0;
            const accuracy = p.totalChars === 0 ? 1 : p.correctChars / p.totalChars;

            const best = getBestForName(p.name);

            players.push({
                id: p.id,
                name: p.name,
                liveProgress: p.typed,
                wpm,
                accuracy: clamp01(accuracy),
                correctWords: p.correctWords,
                committedWords: p.committedWords,
                cursor: p.cursor,
                current: this.wordAt(p.cursor),
                next: this.wordAt(p.cursor + 1),
                next2: this.wordAt(p.cursor + 2),
                bestSentences: best.bestSentences,
                bestWords: best.bestWords,
            });
        }
        players.sort((a, b) => b.wpm - a.wpm);
        return { mode: "words" as const, round: this.round, players, serverNow: now, leaderboard: lb };
    }
}

const sentencesGame = new SentencesGame();
const wordsGame = new WordsGame();

const httpServer = http.createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
});

const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

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
        sentencesGame.finalizeRound(now);
        sentencesGame.nextRound();
        io.to(roomFor("sentences")).emit("state", sentencesGame.toPublicState(now));
    }

    if (wordsGame.shouldRotate(now)) {
        wordsGame.finalizeRound(now);
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