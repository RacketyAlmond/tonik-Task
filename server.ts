import http from "http";
import { Server } from "socket.io";
import { pickSentence } from "./app/lib/game/sentences";
import { scoreRound } from "./app/lib/game/scoring";

type RoundState = {
    roundId: string;
    sentence: string;
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
};

type Player = {
    id: string;
    name: string;
    typed: string;
    lastSeenAt: number;
};

type PublicPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
};

const PORT = Number(process.env.SOCKET_PORT ?? 3002);
const ROUND_MS = Number(process.env.ROUND_MS ?? 30_000);
const ROOM = "global";

function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp01(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

class Game {
    round: RoundState;
    players: Map<string, Player>;
    lastBroadcastAt: number;

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
        this.lastBroadcastAt = 0;
    }

    ensurePlayer(id: string, name: string) {
        const now = Date.now();
        const existing = this.players.get(id);
        if (existing) {
            existing.name = name || existing.name;
            existing.lastSeenAt = now;
            return existing;
        }
        const p: Player = { id, name: name || "Player", typed: "", lastSeenAt: now };
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
        const players: PublicPlayer[] = [];
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
            round: this.round,
            players,
            serverNow: now,
        };
    }
}

const game = new Game();

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
    socket.join(ROOM);

    socket.on("join", (payload: { playerId: string; name: string }) => {
        const playerId = String(payload?.playerId ?? "");
        const name = String(payload?.name ?? "");
        if (!playerId) return;

        game.ensurePlayer(playerId, name);
        socket.data.playerId = playerId;

        const now = Date.now();
        io.to(ROOM).emit("state", game.toPublicState(now));
    });

    socket.on("progress", (payload: { typed: string }) => {
        const playerId = socket.data.playerId as string | undefined;
        if (!playerId) return;
        const typed = String(payload?.typed ?? "");
        game.setProgress(playerId, typed);
    });

    socket.on("disconnect", () => {
        const playerId = socket.data.playerId as string | undefined;
        if (!playerId) return;
        game.removePlayer(playerId);
        const now = Date.now();
        io.to(ROOM).emit("state", game.toPublicState(now));
    });
});

setInterval(() => {
    const now = Date.now();
    if (game.shouldRotate(now)) {
        game.nextRound();
    }
}, 100);

setInterval(() => {
    const now = Date.now();
    io.to(ROOM).emit("state", game.toPublicState(now));
}, 200);

httpServer.listen(PORT, () => {
    process.stdout.write(`socket.io on http://localhost:${PORT}\n`);
});