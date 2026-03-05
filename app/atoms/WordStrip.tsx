"use client";

import * as React from "react";

type Props = {
    current: string;
    next: string;
    next2: string;
    typed: string;
};

export default function WordStrip({ current, next, next2, typed }: Props) {
    const capped = typed.slice(0, current.length);

    const currentNodes = React.useMemo(() => {
        const nodes: React.ReactNode[] = [];
        const len = capped.length;

        for (let i = 0; i < len; i++) {
            const s = current[i] ?? "";
            const t = capped[i] ?? "";
            const ok = s === t;

            nodes.push(
                <span
                    key={`c-${i}`}
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

        if (len < current.length) {
            nodes.push(
                <span key="c-rest" className="text-muted-foreground">
          {current.slice(len)}
        </span>
            );
        }

        return nodes;
    }, [current, capped]);

    return (
        <div className="rounded-md border bg-muted/30 p-4">
            <div className="flex items-center justify-center gap-6">
                <div className="font-mono text-2xl font-semibold tracking-tight">{currentNodes}</div>
                <div className="font-mono text-lg text-muted-foreground/80">{next}</div>
                <div className="font-mono text-base text-muted-foreground/60">{next2}</div>
            </div>
        </div>
    );
}