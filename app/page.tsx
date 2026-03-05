"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/app/atoms/DataTable";

type RoundState = {
    roundId: string;
    sentence: string;
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

type PublicPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
    bestSentences: number;
    bestWords: number;
};

type ServerState = {
    mode: "sentences";
    round: RoundState;
    players: PublicPlayer[];
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

function formatSeconds(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${s}s`;
}

export default function Page() {
    const [name, setName] = useState("You");
    const [joined, setJoined] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);

    const [typed, setTyped] = useState("");
    const [state, setState] = useState<ServerState | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const prevStateRef = useRef<ServerState | null>(null);

    const [roundEndOverlay, setRoundEndOverlay] = useState<{
        roundNumber: number;
        rows: PublicPlayer[];
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

        s.emit("join", { playerId: pid, name: trimmed, mode: "sentences" }, (snap: ServerState) => {
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

    const sentence = state?.round.sentence ?? "";
    const players = state?.players ?? [];
    const me = useMemo(() => players.find((p) => p.id === playerId) ?? null, [players, playerId]);

    const now = state?.serverNow ?? 0;
    const roundEndsAt = state?.round.roundEndsAt ?? 0;
    const timeLeftMs = roundEndsAt - now;
    const roundBadgeVariant = timeLeftMs > 0 ? "default" : "destructive";

    const sentenceView = useMemo(() => {
        const capped = typed.slice(0, sentence.length);
        const nodes: React.ReactNode[] = [];

        for (let i = 0; i < capped.length; i++) {
            const s = sentence[i] ?? "";
            const t = capped[i] ?? "";
            const ok = s === t;

            nodes.push(
                <span key={i} className={ok ? "bg-emerald-500/15 rounded-sm" : "bg-red-500/15 rounded-sm"}>
          {s}
        </span>
            );
        }

        const rest = sentence.slice(capped.length);
        if (rest) nodes.push(<span key="rest" className="text-muted-foreground">{rest}</span>);
        return nodes;
    }, [typed, sentence]);

    const columns: ColumnDef<PublicPlayer>[] = useMemo(
        () => [
            {
                id: "progress",
                header: "Live progress",
                className: "w-[55%] font-mono text-xs sm:text-sm",
                sortValue: (r) => r.liveProgress.length,
                cell: (r) => r.liveProgress || <span className="text-muted-foreground">—</span>,
            },
            {
                id: "name",
                header: "Player",
                className: "w-[20%]",
                sortValue: (r) => r.name,
                cell: (r) => <span className="font-medium">{r.name}</span>,
            },
            {
                id: "wpm",
                header: "WPM",
                className: "text-right w-[12%] tabular-nums",
                sortValue: (r) => r.wpm,
                cell: (r) => Math.round(r.wpm),
            },
            {
                id: "acc",
                header: "Accuracy",
                className: "text-right w-[13%] tabular-nums",
                sortValue: (r) => r.accuracy,
                cell: (r) => `${(r.accuracy * 100).toFixed(0)}%`,
            },
        ],
        []
    );

    const topSentences = state?.leaderboard.sentencesTop ?? [];

    const overlayColumns: ColumnDef<PublicPlayer>[] = columns;

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
                                columns={overlayColumns}
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
                    <p className="text-sm text-muted-foreground">Mode: Sentences</p>
                </div>
                <Badge variant={roundBadgeVariant}>Round ends in {formatSeconds(timeLeftMs)}</Badge>
            </header>

            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle className="text-base">Switch mode</CardTitle>
                    <CardDescription>
                        <a className="underline" href="/words">Go to Words</a>
                    </CardDescription>
                </CardHeader>
            </Card>

            {!joined ? (
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-base">Join</CardTitle>
                        <CardDescription>Open another tab to test multiplayer.</CardDescription>
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
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-base">Current sentence</CardTitle>
                        <CardDescription>Type continuously. Stats update live in the table.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-md border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
                            {sentenceView}
                        </div>
                        <Input
                            value={typed}
                            onChange={(e) => sendProgress(e.target.value)}
                            placeholder="Type here..."
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            disabled={timeLeftMs <= 0}
                        />
                    </CardContent>
                </Card>
            )}

            {me ? (
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-base">Your best</CardTitle>
                        <CardDescription>Saved globally in SQLite</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Best Sentences WPM</div>
                            <div className="text-2xl font-semibold">{Math.round(me.bestSentences)}</div>
                        </div>
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Best Words WPM</div>
                            <div className="text-2xl font-semibold">{Math.round(me.bestWords)}</div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

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
                    <DataTable caption="Only users in sentences mode" columns={columns} rows={players} defaultSort={{ sort: "wpm", dir: "desc" }} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle className="text-base">Global leaderboard (Top 10 Sentences)</CardTitle>
                    <CardDescription>From SQLite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {topSentences.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No results yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {topSentences.map((r, i) => (
                                <div key={r.name} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground mr-2">#{i + 1}</span>
                                        <span className="font-medium">{r.name}</span>
                                    </div>
                                    <div className="text-sm tabular-nums">{Math.round(r.bestSentences)} WPM</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}