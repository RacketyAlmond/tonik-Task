"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Countdown from "@/app/atoms/Countdown";
import GameCard from "@/app/molecules/GameCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/app/atoms/DataTable";

type WordsRound = {
    roundId: string;
    wordIds: number[];
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
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

type ServerState = {
    mode: "words";
    round: WordsRound;
    players: PublicWordsPlayer[];
    serverNow: number;
    leaderboard: LeaderboardState;
};

function getOrCreatePlayerId() {
    const key = "typingrace.playerId";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
}

export default function WordsPage() {
    const [name, setName] = useState("You");
    const [joined, setJoined] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);

    const [typed, setTyped] = useState("");
    const [state, setState] = useState<ServerState | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const prevStateRef = useRef<ServerState | null>(null);

    const [roundEndOverlay, setRoundEndOverlay] = useState<{
        roundNumber: number;
        rows: PublicWordsPlayer[];
        top5: Array<{ name: string; wpm: number }>;
    } | null>(null);

    const overlayTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const s = io("http://localhost:3002", { transports: ["websocket", "polling"] });
        socketRef.current = s;

        s.on("state", (next: ServerState) => {
            const prev = prevStateRef.current;

            if (prev && prev.round.roundId !== next.round.roundId) {
                const rows = [...(prev.players ?? [])];
                const roundNumber = (prev.round.roundIndex ?? 0) + 1;

                const top5 = [...rows]
                    .sort((a, b) => b.wpm - a.wpm)
                    .slice(0, 5)
                    .map((p) => ({ name: p.name, wpm: p.wpm }));

                setTyped("");
                setRoundEndOverlay({ roundNumber, rows, top5 });

                if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
                overlayTimerRef.current = window.setTimeout(() => {
                    setRoundEndOverlay(null);
                }, 5000);
            }

            prevStateRef.current = next;
            setState(next);
        });

        return () => {
            if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
            s.disconnect();
            socketRef.current = null;
        };
    }, []);

    const join = () => {
        const trimmed = name.trim();
        const s = socketRef.current;
        if (!trimmed || !s) return;

        const pid = getOrCreatePlayerId();
        setPlayerId(pid);
        setName(trimmed);
        setJoined(true);

        s.emit("join", { playerId: pid, name: trimmed, mode: "words" }, (snap: ServerState) => {
            prevStateRef.current = snap;
            setState(snap);
            setTyped("");
            setRoundEndOverlay(null);
        });
    };

    const sendProgressDebounceRef = useRef<number | null>(null);
    const sendProgress = (value: string) => {
        setTyped(value);
        const s = socketRef.current;
        if (!joined || !s) return;

        if (sendProgressDebounceRef.current) window.clearTimeout(sendProgressDebounceRef.current);
        sendProgressDebounceRef.current = window.setTimeout(() => {
            s.emit("progress", { typed: value });
        }, 60);
    };

    const commitWord = () => {
        const s = socketRef.current;
        if (!joined || !s) return;
        s.emit("commit");
        setTyped("");
    };

    const players = state?.players ?? [];
    const me = useMemo(() => players.find((p) => p.id === playerId) ?? null, [players, playerId]);

    const current = me?.current ?? "";
    const next = me?.next ?? "";
    const next2 = me?.next2 ?? "";

    const now = state?.serverNow ?? 0;
    const roundEndsAt = state?.round.roundEndsAt ?? 0;
    const disabled = !joined || (roundEndsAt !== 0 && now >= roundEndsAt);

    const columns: ColumnDef<PublicWordsPlayer>[] = useMemo(
        () => [
            {
                id: "progress",
                header: "Live progress",
                className: "w-[45%] font-mono text-xs sm:text-sm",
                sortValue: (r) => r.liveProgress.length,
                cell: (r) => r.liveProgress || <span className="text-muted-foreground">—</span>,
            },
            {
                id: "name",
                header: "Player",
                className: "w-[18%]",
                sortValue: (r) => r.name,
                cell: (r) => <span className="font-medium">{r.name}</span>,
            },
            {
                id: "wpm",
                header: "WPM",
                className: "text-right w-[10%] tabular-nums",
                sortValue: (r) => r.wpm,
                cell: (r) => Math.round(r.wpm),
            },
            {
                id: "acc",
                header: "Accuracy",
                className: "text-right w-[12%] tabular-nums",
                sortValue: (r) => r.accuracy,
                cell: (r) => `${(r.accuracy * 100).toFixed(0)}%`,
            },
            {
                id: "words",
                header: "Words",
                className: "text-right w-[15%] tabular-nums",
                sortValue: (r) => r.correctWords,
                cell: (r) => `${r.correctWords}/${r.committedWords}`,
            },
        ],
        []
    );

    const topWords = state?.leaderboard.wordsTop ?? [];

    return (
        <main className="mx-auto max-w-4xl p-6 space-y-6" suppressHydrationWarning>
            {roundEndOverlay ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
                    <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg">
                        <div className="p-4 border-b space-y-1">
                            <div className="text-sm text-muted-foreground">Round #{roundEndOverlay.roundNumber} finished</div>
                            <div className="text-lg font-semibold">Top 5</div>
                        </div>

                        <div className="p-4 space-y-4">
                            {roundEndOverlay.top5.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No scores.</div>
                            ) : (
                                <div className="grid gap-2">
                                    {roundEndOverlay.top5.map((it, idx) => (
                                        <div key={it.name + idx} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="text-sm">
                                                <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                                                <span className="font-medium">{it.name}</span>
                                            </div>
                                            <div className="text-sm tabular-nums">{Math.round(it.wpm)} WPM</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="text-sm text-muted-foreground">Final table snapshot</div>
                            <DataTable
                                columns={columns}
                                rows={roundEndOverlay.rows}
                                defaultSort={{ sort: "wpm", dir: "desc" }}
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            <header className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Typing Race</h1>
                    <p className="text-sm text-muted-foreground">Mode: Words</p>
                </div>
                <Countdown roundEndsAt={roundEndsAt} now={now} />
            </header>

            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle className="text-base">Switch mode</CardTitle>
                    <CardDescription>
                        <a className="underline" href="/">Go to Sentences</a>
                    </CardDescription>
                </CardHeader>
            </Card>

            {!joined ? (
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-base">Join</CardTitle>
                        <CardDescription>Pick a name and start.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="sm:max-w-xs"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") join();
                            }}
                        />
                        <Button onClick={join} disabled={!name.trim()}>
                            Start
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div
                    onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            commitWord();
                        }
                    }}
                >
                    <GameCard current={current} next={next} next2={next2} typed={typed} onTypedChange={sendProgress} onCommit={commitWord} disabled={disabled} />
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Players</CardTitle>
                        <CardDescription>Sorting/pagination is local + persisted in URL</CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        Round: {(state?.round.roundIndex ?? 0) + 1}
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable caption="Only users in words mode" columns={columns} rows={players} defaultSort={{ sort: "wpm", dir: "desc" }} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle className="text-base">Global leaderboard (Top 10 Words)</CardTitle>
                    <CardDescription>From SQLite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {topWords.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No results yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {topWords.map((r, i) => (
                                <div key={r.name} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground mr-2">#{i + 1}</span>
                                        <span className="font-medium">{r.name}</span>
                                    </div>
                                    <div className="text-sm tabular-nums">{Math.round(r.bestWords)} WPM</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}