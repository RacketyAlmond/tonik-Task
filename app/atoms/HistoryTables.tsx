"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PlayerTable from "@/app/atoms/PlayerTable";

export type RoundSummary = {
    id: string;
    roundNumber: number;
    name: string;
    correctWords: number;
    completedWords: number;
    correctness: number;
    accuracy: number;
    wpm: number;
};

type Props = {
    items: RoundSummary[];
    live: {
        roundNumber: number;
        name: string;
        liveProgress: string;
        correctWords: number;
        completedWords: number;
        correctness: number;
        accuracy: number;
        wpm: number;
    };
};

export default function HistoryTables({ items, live }: Props) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Current round</CardTitle>
                        <CardDescription>Live stats update as you commit words.</CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        Round: {live.roundNumber}
                    </div>
                </CardHeader>
                <CardContent>
                    <PlayerTable
                        name={live.name}
                        liveProgress={live.liveProgress}
                        correctWords={live.correctWords}
                        completedWords={live.completedWords}
                        correctness={live.correctness}
                        accuracy={live.accuracy}
                        wpm={live.wpm}
                    />
                </CardContent>
            </Card>

            {items.length > 0 && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-muted-foreground">Previous rounds</div>
                    <div className="grid gap-4">
                        {items.map((r) => (
                            <Card key={r.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-base">Round {r.roundNumber}</CardTitle>
                                        <CardDescription>Final stats</CardDescription>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        {Math.round(r.wpm)} WPM · {(r.correctness * 100).toFixed(0)}%
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <PlayerTable
                                        name={r.name}
                                        liveProgress=""
                                        correctWords={r.correctWords}
                                        completedWords={r.completedWords}
                                        correctness={r.correctness}
                                        accuracy={r.accuracy}
                                        wpm={r.wpm}
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}