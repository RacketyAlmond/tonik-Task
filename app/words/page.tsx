"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Countdown from "@/app/atoms/Countdown";
import GameCard from "@/app/molecules/GameCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type WordsRound = {
    roundId: string;
    words: [string, string, string];
    roundStartedAt: number;
    roundEndsAt: number;
    roundIndex: number;
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

type ServerState = {
    mode: "words";
    round: WordsRound;
    players: PublicWordsPlayer[];
    serverNow: number;
};

function getOrCreatePlayerId() {
    const key = "typingrace.playerId.words";
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
    const lastRoundIdRef = useRef<string | null>(null);

    useEffect(() => {
        const socket = io("http://localhost:3002", {
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("state", (next: ServerState) => {
            setState(next);

            if (lastRoundIdRef.current && lastRoundIdRef.current !== next.round.roundId) {
                setTyped("");
            }

            lastRoundIdRef.current = next.round.roundId;
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const join = () => {
        const trimmed = name.trim();
        if (!trimmed || !socketRef.current) return;

        const pid = getOrCreatePlayerId();

        setPlayerId(pid);
        setName(trimmed);
        setJoined(true);

        socketRef.current.emit(
            "join",
            { playerId: pid, name: trimmed, mode: "words" },
            (snap: ServerState) => setState(snap)
        );
    };

    const sendProgress = (value: string) => {
        setTyped(value);

        if (!joined || !socketRef.current) return;

        socketRef.current.emit("progress", { typed: value });
    };

    const commitWord = () => {
        if (!joined || !socketRef.current) return;

        socketRef.current.emit("commit");
        setTyped("");
    };

    const words = state?.round.words ?? ["", "", ""] as [string, string, string];
    const current = words[0] ?? "";
    const next = words[1] ?? "";
    const next2 = words[2] ?? "";

    const now = state?.serverNow ?? 0;
    const roundEndsAt = state?.round.roundEndsAt ?? 0;
    const disabled = !joined || (roundEndsAt !== 0 && now >= roundEndsAt);

    const players = state?.players ?? [];

    const me = useMemo(() => {
        return players.find((p) => p.id === playerId) ?? null;
    }, [players, playerId]);

    return (
        <main className="mx-auto max-w-4xl p-6 space-y-6" suppressHydrationWarning>
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
                        <Link className="underline" href="/">
                            Go to Sentences
                        </Link>
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
                    <GameCard
                        current={current}
                        next={next}
                        next2={next2}
                        typed={typed}
                        onTypedChange={sendProgress}
                        onCommit={commitWord}
                        disabled={disabled}
                    />
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Players</CardTitle>
                        <CardDescription>Only users in words mode are shown.</CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        Round: {(state?.round.roundIndex ?? 0) + 1}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>Words mode lobby</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[48%]">Live progress</TableHead>
                                <TableHead className="w-[18%]">Player</TableHead>
                                <TableHead className="text-right w-[10%]">WPM</TableHead>
                                <TableHead className="text-right w-[12%]">Accuracy</TableHead>
                                <TableHead className="text-right w-[12%]">Words</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((p) => (
                                <TableRow key={p.id} className={p.id === playerId ? "bg-muted/40" : ""}>
                                    <TableCell className="font-mono text-xs sm:text-sm">
                                        {p.liveProgress || <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{Math.round(p.wpm)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {(p.accuracy * 100).toFixed(0)}%
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {p.correctWords}/{p.committedWords}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {players.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No players yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {me && (
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-base">Your stats</CardTitle>
                        <CardDescription>Current round performance</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">WPM</div>
                            <div className="text-2xl font-semibold">{Math.round(me.wpm)}</div>
                        </div>
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                            <div className="text-2xl font-semibold">
                                {(me.accuracy * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Correct words</div>
                            <div className="text-2xl font-semibold">{me.correctWords}</div>
                        </div>
                        <div className="rounded-md border p-4">
                            <div className="text-xs text-muted-foreground">Committed words</div>
                            <div className="text-2xl font-semibold">{me.committedWords}</div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}