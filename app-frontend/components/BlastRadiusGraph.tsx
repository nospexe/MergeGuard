"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import type { BlastRadiusData } from "@/lib/llm-pipeline";

interface BlastRadiusGraphProps {
  data: BlastRadiusData;
  width?: number;
  height?: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  file: string;
  symbol: string;
  coverage_status: string;
  coverage: number;
  functions: string[];
  ring: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

const RING_COLORS: Record<number, string> = {
  0: "#ff3333", // Modified file
  1: "#ff8800", // Direct dependents
  2: "#ffcc00", // Transitive
  3: "#00d4ff", // Extended
};

const COVERAGE_COLORS: Record<string, string> = {
  uncovered: "#ff4444",
  partial: "#ffaa22",
  covered: "#00ff88",
};

export default function BlastRadiusGraph({
  data,
  width: propWidth,
  height: propHeight,
}: BlastRadiusGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: SimNode;
  } | null>(null);
  // Only a ref is needed — no re-render required when selection changes
  // (D3 handles the visual highlight directly via DOM manipulation)
  const selectedNodeRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 500, height: propHeight || 500 });

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: propWidth || Math.max(width, 300),
          height: propHeight || Math.max(height, 300),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [propWidth, propHeight]);

  const highlightPath = useCallback(
    (nodeId: string | null) => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);

      if (!nodeId) {
        svg.selectAll(".node-circle").attr("opacity", 1);
        svg.selectAll(".link-line").attr("opacity", 0.3);
        selectedNodeRef.current = null;
        return;
      }

      selectedNodeRef.current = nodeId;

      // Find connected nodes
      const connected = new Set<string>([nodeId]);
      data.edges.forEach((edge) => {
        const s = typeof edge.source === "string" ? edge.source : (edge.source as SimNode).id;
        const t = typeof edge.target === "string" ? edge.target : (edge.target as SimNode).id;
        if (s === nodeId) connected.add(t);
        if (t === nodeId) connected.add(s);
      });

      svg.selectAll<SVGCircleElement, SimNode>(".node-circle")
        .attr("opacity", (d) => (connected.has(d.id) ? 1 : 0.15));

      svg.selectAll<SVGLineElement, SimLink>(".link-line")
        .attr("opacity", (d) => {
          const s = typeof d.source === "string" ? d.source : (d.source as SimNode).id;
          const t = typeof d.target === "string" ? d.target : (d.target as SimNode).id;
          return connected.has(s) && connected.has(t) ? 0.8 : 0.05;
        });
    },
    [data.edges]
  );

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRing = Math.max(...data.nodes.map((n) => n.ring));
    const ringSpacing = Math.min(width, height) / (2 * (maxRing + 2));

    // Draw concentric ring guides
    const ringGroup = svg.append("g").attr("class", "rings");
    for (let r = 0; r <= maxRing; r++) {
      const radius = (r + 1) * ringSpacing;
      ringGroup
        .append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", RING_COLORS[r] || "#333")
        .attr("stroke-opacity", 0.15)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

      // Ring label
      ringGroup
        .append("text")
        .attr("x", centerX + radius + 4)
        .attr("y", centerY - 4)
        .attr("fill", RING_COLORS[r] || "#555")
        .attr("font-size", "9px")
        .attr("font-family", "var(--font-dm-mono)")
        .attr("opacity", 0.6)
        .text(`Ring ${r}`);
    }

    // Create simulation
    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      x: centerX + (Math.random() - 0.5) * 50,
      y: centerY + (Math.random() - 0.5) * 50,
    }));

    const links: SimLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(60)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(centerX, centerY))
      .force(
        "radial",
        d3
          .forceRadial<SimNode>(
            (d) => (d.ring + 1) * ringSpacing,
            centerX,
            centerY
          )
          .strength(0.8)
      )
      .force("collision", d3.forceCollide<SimNode>().radius(14));

    // Draw links
    const linkGroup = svg.append("g").attr("class", "links");
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link-line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);

    // Draw nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const nodeElements = nodeGroup
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => (d.ring === 0 ? 10 : 7))
      .attr("fill", (d) => COVERAGE_COLORS[d.coverage_status] || "#666")
      .attr("stroke", (d) => RING_COLORS[d.ring] || "#444")
      .attr("stroke-width", (d) => (d.ring === 0 ? 3 : 1.5))
      .attr("cursor", "pointer")
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.symbol} - ${d.file} - Coverage: ${d.coverage}%`)
      .attr("tabindex", 0);

    // Node labels for ring 0 and 1
    const labelGroup = svg.append("g").attr("class", "labels");
    const labelElements = labelGroup
      .selectAll("text")
      .data(nodes.filter((n) => n.ring <= 1))
      .join("text")
      .attr("font-size", "8px")
      .attr("font-family", "var(--font-dm-mono)")
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .attr("dy", -14)
      .text((d) => d.symbol);

    // Interactions
    nodeElements
      .on("mouseover", function (event, d) {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({ x, y, node: d });
        d3.select(this).attr("r", (d as SimNode).ring === 0 ? 13 : 10);
      })
      .on("mouseout", function (_, d) {
        setTooltip(null);
        d3.select(this).attr("r", (d as SimNode).ring === 0 ? 10 : 7);
      })
      .on("click", (_, d) => {
        highlightPath(selectedNodeRef.current === d.id ? null : d.id);
      })
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          highlightPath(selectedNodeRef.current === d.id ? null : d.id);
        }
      });

    // Drag behavior
    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    // Tick
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      nodeElements.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);

      labelElements
        .attr("x", (d) => d.x ?? 0)
        .attr("y", (d) => d.y ?? 0);
    });

    // Pulse animation for ring 0
    nodeElements
      .filter((d) => d.ring === 0)
      .attr("class", "node-circle ring-zero-pulse");

    return () => {
      simulation.stop();
      // Remove event listeners to prevent leaks in React StrictMode
      nodeElements.on("mouseover", null).on("mouseout", null).on("click", null).on("keydown", null);
    };
  }, [data, dimensions, highlightPath]);  // removed selectedNode to prevent full restart on click

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px]">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        role="img"
        aria-label="Blast radius force-directed graph showing dependency impact"
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-[9px] font-mono">
        {Object.entries(COVERAGE_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-text-3 capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Risk Score */}
      <div className="absolute top-3 right-3 flex flex-col items-end">
        <span className="text-[9px] font-mono text-text-3 uppercase tracking-wider">
          Risk Score
        </span>
        <span
          className="text-2xl font-bold font-mono"
          style={{
            color:
              data.risk_score > 70
                ? "#ff4444"
                : data.risk_score > 40
                ? "#ffaa22"
                : "#00ff88",
          }}
        >
          {data.risk_score}
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none rounded-lg border border-glass-border bg-bg-raised/95 backdrop-blur-sm px-3 py-2 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, dimensions.width - 200),
            top: tooltip.y - 10,
          }}
        >
          <p className="text-[11px] font-semibold text-text-1">
            {tooltip.node.symbol}
          </p>
          <p className="text-[9px] font-mono text-text-3 mt-0.5">
            {tooltip.node.file}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background:
                  COVERAGE_COLORS[tooltip.node.coverage_status] || "#666",
              }}
            />
            <span className="text-[10px] text-text-2">
              Coverage: {tooltip.node.coverage}%
            </span>
          </div>
          {tooltip.node.functions.length > 0 && (
            <p className="text-[9px] text-text-3 mt-1">
              Functions: {tooltip.node.functions.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
