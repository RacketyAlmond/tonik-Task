"use client";

import * as React from "react";

type Props = {
    sentence: string;
    typed: string;
};

export default function Sentence({ sentence, typed }: Props) {
    const capped = typed.slice(0, sentence.length);

    const parts = React.useMemo(() => {
        const nodes: React.ReactNode[] = [];
        const len = capped.length;

        for (let i = 0; i < len; i++) {
            const s = sentence[i] ?? "";
            const t = capped[i] ?? "";
            const ok = s === t;

            nodes.push(
                <span
                    key={`t-${i}`}
                    className={
                        ok
                            ? "text-foreground bg-emerald-500/15 rounded-sm"
                            : "text-foreground bg-red-500/15 rounded-sm"
                    }
                >
          {s}
        </span>
            );
        }

        if (len < sentence.length) {
            nodes.push(
                <span key="rest" className="text-muted-foreground">
          {sentence.slice(len)}
        </span>
            );
        }

        return nodes;
    }, [sentence, capped]);

    return (
        <div className="rounded-md border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
            {parts}
        </div>
    );
}