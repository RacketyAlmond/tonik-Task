"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

function createClockStore() {
    let now = Date.now();
    const listeners = new Set<Listener>();
    let timer: number | null = null;

    const emit = () => {
        now = Date.now();
        for (const l of listeners) l();
    };

    return {
        getSnapshot: () => now,
        subscribe: (listener: Listener) => {
            listeners.add(listener);
            if (timer === null) {
                timer = window.setInterval(emit, 100);
            }
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0 && timer !== null) {
                    window.clearInterval(timer);
                    timer = null;
                }
            };
        },
    };
}

const clock = typeof window !== "undefined" ? createClockStore() : null;

export function useNow() {
    return useSyncExternalStore(
        (cb) => clock?.subscribe(cb) ?? (() => {}),
        () => clock?.getSnapshot() ?? 0,
        () => 0
    );
}