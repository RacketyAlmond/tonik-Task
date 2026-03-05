"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
    roundEndsAt: number;
    now: number;
};

function formatSeconds(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${s}s`;
}

export default function Countdown({ roundEndsAt, now }: Props) {
    const left = roundEndsAt - now;
    return (
        <Badge variant={left > 0 ? "default" : "destructive"}>
            Round ends in {formatSeconds(left)}
        </Badge>
    );
}