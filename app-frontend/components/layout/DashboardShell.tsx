"use client";

import type { ReactNode } from "react";

interface DashboardShellProps {
    children: ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
    return (
        <main className="ml-60 pt-0 min-h-[calc(100vh-56px)]">
            <div className="p-6">{children}</div>
        </main>
    );
}
