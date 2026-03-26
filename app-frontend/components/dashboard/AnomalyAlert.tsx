"use client";

import { AlertTriangle } from "lucide-react";
import type { AnomalyData } from "@/lib/types";

interface AnomalyAlertProps {
    data: AnomalyData;
}

export default function AnomalyAlert({ data }: AnomalyAlertProps) {
    return (
        <div className="flex items-start gap-3 rounded-panel border-[0.5px] border-red-border bg-red/[0.08] p-3.5">
            <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-red-dim">
                <AlertTriangle className="h-[10px] w-[10px] text-red" />
            </div>
            <div>
                <p className="text-[13px] font-semibold text-red">{data.title}</p>
                <p className="mt-0.5 text-[12px] text-red/70">{data.body}</p>
            </div>
        </div>
    );
}
