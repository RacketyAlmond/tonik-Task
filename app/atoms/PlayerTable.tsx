"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableCaption,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Props = {
    name: string;
    liveProgress: string;
    correctWords: number;
    completedWords: number;
    correctness: number;
    accuracy: number;
    wpm: number;
};

export default function PlayerTable({
                                        name,
                                        liveProgress,
                                        correctWords,
                                        completedWords,
                                        correctness,
                                        accuracy,
                                        wpm,
                                    }: Props) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[52%]">Live progress</TableHead>
                    <TableHead className="w-[18%]">Player</TableHead>
                    <TableHead className="text-right w-[10%]">WPM</TableHead>
                    <TableHead className="text-right w-[10%]">Words</TableHead>
                    <TableHead className="text-right w-[10%]">Correctness</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell className="font-mono text-xs sm:text-sm">
                        {liveProgress.length ? liveProgress : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(wpm)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                        {correctWords}/{completedWords}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                        {(correctness * 100).toFixed(0)}%{" "}
                        <span className="text-muted-foreground">
              ({(accuracy * 100).toFixed(0)}% acc)
            </span>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}