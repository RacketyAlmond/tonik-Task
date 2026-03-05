"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

export default function TypingInput({ value, onChange, disabled }: Props) {
    return (
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={disabled ? "Join to start typing..." : "Type here..."}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
        />
    );
}