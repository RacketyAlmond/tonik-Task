"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type SortDir = "asc" | "desc";

export type ColumnDef<T> = {
    id: string;
    header: string;
    className?: string;
    sortValue?: (row: T) => string | number;
    cell: (row: T) => React.ReactNode;
};

function clampInt(n: number, min: number, max: number) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseIntOr(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function compare(a: string | number, b: string | number) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
}

export function useTableUrlState(defaultSort: { sort: string; dir: SortDir }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    const sort = sp.get("sort") || defaultSort.sort;
    const dir = (sp.get("dir") as SortDir) || defaultSort.dir;

    const page = clampInt(parseIntOr(sp.get("page"), 1), 1, 10_000);
    const ps = clampInt(parseIntOr(sp.get("ps"), 10), 5, 50);

    const setParams = (next: Partial<{ sort: string; dir: SortDir; page: number; ps: number }>) => {
        const params = new URLSearchParams(sp.toString());
        if (next.sort !== undefined) params.set("sort", next.sort);
        if (next.dir !== undefined) params.set("dir", next.dir);
        if (next.page !== undefined) params.set("page", String(next.page));
        if (next.ps !== undefined) params.set("ps", String(next.ps));
        router.replace(`${pathname}?${params.toString()}`);
    };

    return { sort, dir, page, ps, setParams };
}

export function DataTable<T>({
                                 title,
                                 caption,
                                 columns,
                                 rows,
                                 defaultSort,
                             }: {
    title?: React.ReactNode;
    caption?: React.ReactNode;
    columns: ColumnDef<T>[];
    rows: T[];
    defaultSort: { sort: string; dir: SortDir };
}) {
    const { sort, dir, page, ps, setParams } = useTableUrlState(defaultSort);

    const sortCol = useMemo(() => columns.find((c) => c.id === sort) ?? columns[0], [columns, sort]);
    const sorted = useMemo(() => {
        const fn = sortCol?.sortValue;
        if (!fn) return rows;
        const copy = [...rows];
        copy.sort((ra, rb) => {
            const av = fn(ra);
            const bv = fn(rb);
            const c = compare(av, bv);
            return dir === "asc" ? c : -c;
        });
        return copy;
    }, [rows, sortCol, dir]);

    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / ps));
    const safePage = clampInt(page, 1, pageCount);

    const paged = useMemo(() => {
        const start = (safePage - 1) * ps;
        return sorted.slice(start, start + ps);
    }, [sorted, safePage, ps]);

    return (
        <div className="space-y-3">
            {title ? <div className="text-sm text-muted-foreground">{title}</div> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">Rows:</div>
                    {[5, 10, 20, 50].map((n) => (
                        <Button
                            key={n}
                            variant={ps === n ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setParams({ ps: n, page: 1 })}
                        >
                            {n}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setParams({ page: Math.max(1, safePage - 1) })}
                        disabled={safePage <= 1}
                    >
                        Prev
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        Page {safePage} / {pageCount}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setParams({ page: Math.min(pageCount, safePage + 1) })}
                        disabled={safePage >= pageCount}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <Table>
                {caption ? <caption className="text-xs text-muted-foreground">{caption}</caption> : null}
                <TableHeader>
                    <TableRow>
                        {columns.map((c) => {
                            const active = c.id === sort;
                            const nextDir: SortDir = active ? (dir === "asc" ? "desc" : "asc") : defaultSort.dir;
                            return (
                                <TableHead
                                    key={c.id}
                                    className={`select-none cursor-pointer ${c.className ?? ""}`}
                                    onClick={() => setParams({ sort: c.id, dir: nextDir, page: 1 })}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{c.header}</span>
                                        {active ? <span className="text-xs">{dir === "asc" ? "▲" : "▼"}</span> : null}
                                    </div>
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paged.map((r, idx) => (
                        <TableRow key={idx}>
                            {columns.map((c) => (
                                <TableCell key={c.id} className={c.className ?? ""}>
                                    {c.cell(r)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {paged.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                                No rows.
                            </TableCell>
                        </TableRow>
                    ) : null}
                </TableBody>
            </Table>
        </div>
    );
}