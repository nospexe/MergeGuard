"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import RiskTable from "@/components/dashboard/RiskTable";
import EnginePanel from "@/components/dashboard/EnginePanel";
import AnomalyAlert from "@/components/dashboard/AnomalyAlert";
import { metrics, riskItems, engineStatus, gitMiner, systemPulse, anomaly } from "@/lib/mock-data";

export default function DashboardPage() {
    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h1 className="text-[32px] font-bold tracking-tight text-text-1">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-text-2">
                    Real-time PR risk monitoring and analysis overview
                </p>
            </div>

            {/* Anomaly Alert */}
            <AnomalyAlert data={anomaly} />

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {metrics.map((m) => (
                    <MetricCard key={m.label} {...m} />
                ))}
            </div>

            {/* Risk Table + Engine Panel */}
            <div className="flex flex-col lg:flex-row gap-5">
                <RiskTable items={riskItems} />
                <EnginePanel engine={engineStatus} miner={gitMiner} pulse={systemPulse} />
            </div>
        </div>
    );
}
