"use client";

import { useEffect, useState } from "react";

interface SystemPulseProps {
    values: number[];
}

export default function SystemPulse({ values }: SystemPulseProps) {
    const [mounted, setMounted] = useState(false);
    const max = Math.max(...values);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex items-end gap-[3px] h-12">
            {values.map((val, i) => {
                const height = (val / max) * 100;
                const isActive = i === values.length - 1;
                return (
                    <div
                        key={i}
                        className="flex-1 rounded-sm transition-all duration-500"
                        style={{
                            height: mounted ? `${height}%` : "0%",
                            backgroundColor: isActive ? "rgba(59,130,246,0.7)" : "rgba(59,130,246,0.3)",
                            transitionDelay: mounted ? `${i * 50}ms` : "0ms",
                        }}
                    />
                );
            })}
        </div>
    );
}
