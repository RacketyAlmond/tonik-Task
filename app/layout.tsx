// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Typing Race",
    description: "Real-time typing competition",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        </body>
        </html>
    );
}