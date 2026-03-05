"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import WordStrip from "@/app/atoms/WordStrip";
import TypingInput from "@/app/atoms/TypingInput";

type Props = {
    current: string;
    next: string;
    next2: string;
    typed: string;
    onTypedChange: (value: string) => void;
    onCommit: () => void;
    disabled?: boolean;
};

export default function GameCard({
                                     current,
                                     next,
                                     next2,
                                     typed,
                                     onTypedChange,
                                     onCommit,
                                     disabled,
                                 }: Props) {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-base">Type the word</CardTitle>
                <CardDescription>Commit with Space or Enter. Only correct words increase the score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <WordStrip current={current} next={next} next2={next2} typed={typed} />
                <div className="space-y-2">
                    <div className="text-sm font-medium">Your input</div>
                    <TypingInput
                        value={typed}
                        onChange={onTypedChange}
                        disabled={disabled}
                    />
                    <div className="text-xs text-muted-foreground">
                        Tip: press Space to lock in the current word.
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                        disabled={disabled}
                        onClick={onCommit}
                        type="button"
                    >
                        Commit
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}