"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type RoundState = {
    roundId: string;
    sentence: string;
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
};

type PublicPlayer = {
    id: string;
    name: string;
    liveProgress: string;
    wpm: number;
    accuracy: number;
};

type ServerState = {
    mode: "sentences";
    round: RoundState;
    players: PublicPlayer[];
    serverNow: number;
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

    const [typed, setTyped] = useState("");
    const [state, setState] = useState<ServerState | null>(null);

    const [fallbackNow, setFallbackNow] = useState(0);

    const socketRef = useRef<Socket | null>(null);
    const playerIdRef = useRef<string | null>(null);
    const lastRoundIdRef = useRef<string | null>(null);

    const serverNow = state?.serverNow;
    useEffect(() => {
        setFallbackNow(Date.now());
    }, [serverNow]);

    useEffect(() => {
        const s = io("http://localhost:3002", {
            transports: ["websocket", "polling"],
        });

        socketRef.current = s;

        s.on("state", (next: ServerState) => {
            setState(next);

            if (lastRoundIdRef.current && lastRoundIdRef.current !== next.round.roundId) {
                setTyped("");
            }
            lastRoundIdRef.current = next.round.roundId;
        });

        return () => {
            s.disconnect();
            socketRef.current = null;
        };
    }, []);

    const join = () => {
        const n = name.trim();
        if (!n) return;

        setName(n);
        setJoined(true);

        const pid = getOrCreatePlayerId();
        playerIdRef.current = pid;

        socketRef.current?.emit("join", { playerId: pid, name: n, mode: "sentences" });
    };

    const sendProgressDebounceRef = useRef<number | null>(null);
    const sendProgress = (value: string) => {
        setTyped(value);

        if (!joined) return;

        if (sendProgressDebounceRef.current) {
            window.clearTimeout(sendProgressDebounceRef.current);
        }

        sendProgressDebounceRef.current = window.setTimeout(() => {
            socketRef.current?.emit("progress", { typed: value });
        }, 60);
    };

    const sentence = state?.round.sentence ?? "";
    const players = state?.players ?? [];

    const roundEndsAt = state?.round.roundEndsAt ?? 0;
    const now = serverNow ?? fallbackNow;
    const timeLeftMs = roundEndsAt - now;

    const sentenceView = useMemo(() => {
        const capped = typed.slice(0, sentence.length);
        const nodes: React.ReactNode[] = [];

        for (let i = 0; i < capped.length; i++) {
            const s = sentence[i] ?? "";
            const t = capped[i] ?? "";
            const ok = s === t;

            nodes.push(
                <span
                    key={i}
                    className={ok ? "bg-emerald-500/15 rounded-sm" : "bg-red-500/15 rounded-sm"}
                >
          {s}
        </span>
            );
        }

        const rest = sentence.slice(capped.length);
        if (rest) {
            nodes.push(
                <span key="rest" className="text-muted-foreground">
          {rest}
        </span>
            );
        }

        return nodes;
    }, [typed, sentence]);

    const roundBadgeVariant = timeLeftMs > 0 ? "default" : "destructive";

    return (
        <main className="mx-auto max-w-4xl p-6 space-y-6" suppressHydrationWarning>
            <header className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Typing Race</h1>
                    <p className="text-sm text-muted-foreground">Mode: Sentences</p>
                </div>
                <Badge variant={roundBadgeVariant}>
                    Round ends in {formatSeconds(timeLeftMs)}
                </Badge>
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

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Players</CardTitle>
                        <CardDescription>Only users in sentences mode are shown.</CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        Round: {(state?.round.roundIndex ?? 0) + 1}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>Updates are broadcast ~5x/sec.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[55%]">Live progress</TableHead>
                                <TableHead className="w-[20%]">Player</TableHead>
                                <TableHead className="text-right w-[12%]">WPM</TableHead>
                                <TableHead className="text-right w-[13%]">Accuracy</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((p) => (
                                <TableRow key={p.id} className={p.id === playerIdRef.current ? "bg-muted/40" : ""}>
                                    <TableCell className="font-mono text-xs sm:text-sm">
                                        {p.liveProgress || <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{Math.round(p.wpm)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {(p.accuracy * 100).toFixed(0)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                            {players.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No players yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}