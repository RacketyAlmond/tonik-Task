"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Countdown from "@/app/atoms/Countdown";
import GameCard from "@/app/molecules/GameCard";
import HistoryTables, { type RoundSummary } from "@/app/atoms/HistoryTables";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { countCorrectCharsForWord, generateWordQueue } from "@/app/lib/game/words";

const ROUND_MS = 30_000;

function clamp01(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function newId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Page() {
    const [now, setNow] = useState(0);

    const [joined, setJoined] = useState(false);
    const [name, setName] = useState("You");

    const [roundIndex, setRoundIndex] = useState(0);
    const [roundStartedAt, setRoundStartedAt] = useState(0);
    const [roundEndsAt, setRoundEndsAt] = useState(0);

    const [queue, setQueue] = useState<string[]>([]);
    const [typed, setTyped] = useState("");

    const [correctWords, setCorrectWords] = useState(0);
    const [completedWords, setCompletedWords] = useState(0);
    const [correctness, setCorrectness] = useState(1);

    const [totalChars, setTotalChars] = useState(0);
    const [correctChars, setCorrectChars] = useState(0);
    const [accuracy, setAccuracy] = useState(1);

    const [wpm, setWpm] = useState(0);
    const [history, setHistory] = useState<RoundSummary[]>([]);

    const initializedRef = useRef(false);

    useEffect(() => {
        const id = window.setInterval(() => {
            queueMicrotask(() => setNow(Date.now()));
        }, 100);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const t = Date.now();
        queueMicrotask(() => {
            setNow(t);
            setRoundStartedAt(t);
            setRoundEndsAt(t + ROUND_MS);
            setQueue(generateWordQueue(3));
        });
    }, []);

    const current = useMemo(() => queue[0] ?? "", [queue]);
    const next = useMemo(() => queue[1] ?? "", [queue]);
    const next2 = useMemo(() => queue[2] ?? "", [queue]);

    const computeWpm = useCallback(
        (nextCorrectWords: number, at: number) => {
            const elapsedMsRaw = at - roundStartedAt;
            const elapsedMs = Math.max(3_000, elapsedMsRaw);
            const minutes = elapsedMs / 60_000;
            return minutes > 0 ? nextCorrectWords / minutes : 0;
        },
        [roundStartedAt]
    );

    const resetRound = useCallback((nextRoundIndex: number) => {
        const t = Date.now();
        setRoundIndex(nextRoundIndex);
        setRoundStartedAt(t);
        setRoundEndsAt(t + ROUND_MS);
        setQueue(generateWordQueue(3));
        setTyped("");
        setCorrectWords(0);
        setCompletedWords(0);
        setCorrectness(1);
        setTotalChars(0);
        setCorrectChars(0);
        setAccuracy(1);
        setWpm(0);
    }, []);

    const buildSummary = useCallback(
        (finalAt: number): RoundSummary => {
            const cw = correctWords;
            const comp = completedWords;
            const tc = totalChars;
            const cc = correctChars;

            return {
                id: newId(),
                roundNumber: roundIndex + 1,
                name,
                correctWords: cw,
                completedWords: comp,
                correctness: clamp01(comp === 0 ? 1 : cw / comp),
                accuracy: clamp01(tc === 0 ? 1 : cc / tc),
                wpm: computeWpm(cw, finalAt),
            };
        },
        [correctWords, completedWords, totalChars, correctChars, roundIndex, name, computeWpm]
    );

    useEffect(() => {
        if (!joined) return;
        if (roundEndsAt === 0) return;
        if (now < roundEndsAt) return;

        const at = Date.now();
        const summary = buildSummary(at);

        queueMicrotask(() => {
            setHistory((prev) => [summary, ...prev].slice(0, 3));
            resetRound(roundIndex + 1);
        });
    }, [joined, now, roundEndsAt, buildSummary, resetRound, roundIndex]);

    const commitWord = useCallback(() => {
        if (!joined) return;

        const at = Date.now();
        const typedWord = typed.trim().toLowerCase();
        const target = current.toLowerCase();

        const wordTotal = target.length;
        const wordCorrectChars = countCorrectCharsForWord(target, typedWord);

        const nextTotalChars = totalChars + wordTotal;
        const nextCorrectChars = correctChars + wordCorrectChars;

        const nextCompleted = completedWords + 1;
        const isCorrect = typedWord === target;
        const nextCorrectWords = correctWords + (isCorrect ? 1 : 0);

        setTotalChars(nextTotalChars);
        setCorrectChars(nextCorrectChars);
        setAccuracy(clamp01(nextTotalChars === 0 ? 1 : nextCorrectChars / nextTotalChars));

        setCompletedWords(nextCompleted);
        setCorrectWords(nextCorrectWords);
        setCorrectness(clamp01(nextCompleted === 0 ? 1 : nextCorrectWords / nextCompleted));

        setWpm(computeWpm(nextCorrectWords, at));

        setQueue((prev) => {
            const shifted = prev.slice(1);
            shifted.push(generateWordQueue(1)[0]!);
            return shifted;
        });

        setTyped("");
    }, [
        joined,
        typed,
        current,
        totalChars,
        correctChars,
        completedWords,
        correctWords,
        computeWpm,
    ]);

    const onJoin = useCallback(() => {
        const n = name.trim();
        if (!n) return;
        setName(n);
        setJoined(true);
        setHistory([]);
        resetRound(0);
    }, [name, resetRound]);

    const disabled = !joined || (roundEndsAt !== 0 && now >= roundEndsAt);

    return (
        <main className="mx-auto max-w-4xl p-6 space-y-6" suppressHydrationWarning>
            <header className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Typing Race</h1>
                    <p className="text-sm text-muted-foreground">
                        Three-word conveyor. Commit with Space/Enter.
                    </p>
                </div>
                <Countdown roundEndsAt={roundEndsAt} now={now} />
            </header>

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
                                if (e.key === "Enter") onJoin();
                            }}
                        />
                        <Button onClick={onJoin} disabled={!name.trim()}>
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
                        onTypedChange={setTyped}
                        onCommit={commitWord}
                        disabled={disabled}
                    />
                </div>
            )}

            <HistoryTables
                items={history}
                live={{
                    roundNumber: roundIndex + 1,
                    name,
                    liveProgress: typed,
                    correctWords,
                    completedWords,
                    correctness,
                    accuracy,
                    wpm,
                }}
            />
        </main>
    );
}