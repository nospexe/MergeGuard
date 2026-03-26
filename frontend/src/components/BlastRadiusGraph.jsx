import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

/**
 * BlastRadiusGraph — D3.js Force-Directed Graph
 *
 * Renders a concentric ring layout showing the blast radius of a code change.
 * - Centre: changed file
 * - Ring 1–3: dependency depth (direct → transitive → deep)
 * - Colour: coverage heat map (green → amber → red)
 * - Click: highlights affected path from source to target
 */
export default function BlastRadiusGraph({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 500 });

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width, height: 500 });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Coverage → colour
  const coverageColor = useCallback((coverage) => {
    if (coverage >= 0.8) return '#10b981';
    if (coverage >= 0.4) return '#f59e0b';
    return '#f43f5e';
  }, []);

  // Node radius based on ring
  const nodeRadius = useCallback((node) => {
    if (node.ring === 0) return 28;
    if (node.ring === 1) return 18;
    if (node.ring === 2) return 14;
    return 11;
  }, []);

  // Get file basename for labels
  const basename = (path) => path.split('/').pop();

  // Main D3 render
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr(
        'aria-label',
        `Blast radius graph showing ${data.nodes.length} affected files and ${(data.links || data.edges || []).length} dependency edges`
      );

    // Defs for glow filters and gradients
    const defs = svg.append('defs');

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow');
    glow
      .append('feGaussianBlur')
      .attr('stdDeviation', 3)
      .attr('result', 'coloredBlur');
    const femerge = glow.append('feMerge');
    femerge.append('feMergeNode').attr('in', 'coloredBlur');
    femerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for center node
    const glowStrong = defs.append('filter').attr('id', 'glow-strong');
    glowStrong
      .append('feGaussianBlur')
      .attr('stdDeviation', 6)
      .attr('result', 'coloredBlur');
    const femerge2 = glowStrong.append('feMerge');
    femerge2.append('feMergeNode').attr('in', 'coloredBlur');
    femerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    // Ring guides (concentric circles)
    const ringRadii = [
      0,
      Math.min(width, height) * 0.15,
      Math.min(width, height) * 0.27,
      Math.min(width, height) * 0.38,
    ];
    const ringGroup = svg.append('g').attr('class', 'ring-guides');

    ringRadii.slice(1).forEach((r, i) => {
      ringGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(99, 102, 241, 0.08)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4');

      ringGroup
        .append('text')
        .attr('x', cx + r + 6)
        .attr('y', cy - 4)
        .attr('fill', 'rgba(99, 102, 241, 0.25)')
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(`Ring ${i + 1}`);
    });

    // Prepare nodes and links (deep clone to avoid mutation)
    const nodes = data.nodes.map((n) => ({
      ...n,
      x: cx + ringRadii[n.ring] * Math.cos(Math.random() * Math.PI * 2),
      y: cy + ringRadii[n.ring] * Math.sin(Math.random() * Math.PI * 2),
    }));

    const linkData = data.links || data.edges || [];
    const links = linkData.map((l) => ({
      ...l,
      source: nodes.find((n) => n.id === l.source) || l.source,
      target: nodes.find((n) => n.id === l.target) || l.target,
    }));

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => 80 + d.source.ring * 30)
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(cx, cy))
      .force(
        'radial',
        d3.forceRadial((d) => ringRadii[d.ring] || 150, cx, cy).strength(0.6)
      )
      .force(
        'collision',
        d3.forceCollide().radius((d) => nodeRadius(d) + 8)
      );

    // Link elements
    const linkGroup = svg.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(99, 102, 241, 0.15)')
      .attr('stroke-width', (d) => d.weight || 1)
      .attr('stroke-dasharray', (d) => (d.weight === 1 ? '3 3' : 'none'));

    // Node groups
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .attr('tabindex', '0')
      .attr('role', 'button')
      .attr(
        'aria-label',
        (d) =>
          `${d.id}, Ring ${d.ring}, Coverage ${Math.round(d.coverage * 100)}%`
      )
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    nodeElements
      .append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => coverageColor(d.coverage))
      .attr('fill-opacity', (d) =>
        d.ring === 0 ? 0.9 : 0.15 + d.coverage * 0.55
      )
      .attr('stroke', (d) => coverageColor(d.coverage))
      .attr('stroke-width', (d) => (d.ring === 0 ? 3 : 1.5))
      .attr('filter', (d) =>
        d.ring === 0
          ? 'url(#glow-strong)'
          : d.coverage < 0.4
            ? 'url(#glow)'
            : 'none'
      );

    // Coverage ring (arc showing %)
    nodeElements.each(function (d) {
      const r = nodeRadius(d);
      if (d.ring === 0) return;

      const arc = d3
        .arc()
        .innerRadius(r + 3)
        .outerRadius(r + 5)
        .startAngle(0)
        .endAngle(d.coverage * Math.PI * 2)
        .cornerRadius(2);

      d3.select(this)
        .append('path')
        .attr('d', arc)
        .attr('fill', coverageColor(d.coverage))
        .attr('opacity', 0.7);
    });

    // Test icon for test files
    nodeElements
      .filter((d) => d.type === 'test')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => nodeRadius(d) * 0.7)
      .attr('fill', 'white')
      .attr('aria-hidden', 'true')
      .text('✓');

    // Center node label (inside)
    nodeElements
      .filter((d) => d.ring === 0)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('fill', 'white')
      .text((d) => basename(d.id).split('.')[0]);

    // Labels for all nodes
    nodeElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeRadius(d) + 14)
      .attr('font-size', '9px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('fill', '#94a3b8')
      .text((d) => basename(d.id));

    // Tooltip handlers
    const tooltip = d3.select(tooltipRef.current);

    nodeElements
      .on('mouseover', (event, d) => {
        linkElements
          .attr('stroke', (l) =>
            l.source.id === d.id || l.target.id === d.id
              ? coverageColor(d.coverage)
              : 'rgba(99, 102, 241, 0.08)'
          )
          .attr('stroke-width', (l) =>
            l.source.id === d.id || l.target.id === d.id
              ? (l.weight || 1) * 2
              : l.weight || 1
          )
          .attr('stroke-opacity', (l) =>
            l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.3
          );

        nodeElements.select('circle').attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const connected = links.some(
            (l) =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
          );
          return connected ? 1 : 0.3;
        });

        tooltip.classed('visible', true);
        tooltip.html(`
          <div class="graph-tooltip__title">${d.id}</div>
          <div class="graph-tooltip__meta">
            <span>Coverage: ${Math.round(d.coverage * 100)}%</span>
            <span>Lines: ${d.lines}</span>
            <span>Ring: ${d.ring}</span>
          </div>
          <div class="graph-tooltip__functions">
            Functions: ${d.functions.join(', ')}
          </div>
        `);
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect();
        tooltip
          .style('left', event.clientX - rect.left + 15 + 'px')
          .style('top', event.clientY - rect.top - 10 + 'px');
      })
      .on('mouseout', () => {
        linkElements
          .attr('stroke', 'rgba(99, 102, 241, 0.15)')
          .attr('stroke-width', (d) => d.weight || 1)
          .attr('stroke-opacity', 1);

        nodeElements.select('circle').attr('opacity', 1);
        tooltip.classed('visible', false);
      })
      .on('click', (event, d) => {
        setSelectedNode((prev) => (prev?.id === d.id ? null : d));
      });

    // Tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Entrance animation
    svg.attr('opacity', 0).transition().duration(600).attr('opacity', 1);

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, coverageColor, nodeRadius]);

  if (!data) return null;

  const linkCount = (data.links || data.edges || []).length;

  return (
    <section
      className="panel blast-radius animate-scale-in"
      aria-label="Blast radius visualization"
    >
      <div className="panel__header">
        <div className="panel__title">
          <span className="panel__title-icon" aria-hidden="true">
            💥
          </span>
          Blast Radius Graph
        </div>
        <span
          className="panel__badge"
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#a5b4fc',
          }}
        >
          {data.nodes.length} files · {linkCount} edges
        </span>
      </div>
      <div
        className="panel__content"
        ref={containerRef}
        style={{ position: 'relative' }}
      >
        <svg ref={svgRef} className="blast-radius__canvas" />
        <div ref={tooltipRef} className="graph-tooltip" role="tooltip" />
      </div>
      <div className="blast-radius__legend" aria-label="Graph legend">
        <div className="blast-radius__legend-item">
          <div
            className="blast-radius__legend-dot"
            style={{ background: '#10b981' }}
            aria-hidden="true"
          />
          <span>{'> 80% coverage'}</span>
        </div>
        <div className="blast-radius__legend-item">
          <div
            className="blast-radius__legend-dot"
            style={{ background: '#f59e0b' }}
            aria-hidden="true"
          />
          <span>40–80% coverage</span>
        </div>
        <div className="blast-radius__legend-item">
          <div
            className="blast-radius__legend-dot"
            style={{ background: '#f43f5e' }}
            aria-hidden="true"
          />
          <span>{'< 40% coverage'}</span>
        </div>
        <div className="blast-radius__legend-item">
          <div
            className="blast-radius__legend-dot"
            style={{
              background: 'transparent',
              border: '2px solid #94a3b8',
            }}
            aria-hidden="true"
          />
          <span>Test file</span>
        </div>
        <div
          className="blast-radius__legend-item"
          style={{ marginLeft: 'auto' }}
        >
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>
            Drag nodes · Hover to highlight paths
          </span>
        </div>
      </div>

      {/* Selected node detail card */}
      {selectedNode && (
        <div
          role="dialog"
          aria-label={`Details for ${selectedNode.id}`}
          style={{
            position: 'absolute',
            bottom: 60,
            right: 24,
            background: 'rgba(17, 24, 39, 0.95)',
            border: `1px solid ${coverageColor(selectedNode.coverage)}40`,
            borderRadius: '10px',
            padding: '12px 16px',
            maxWidth: '260px',
            fontSize: '0.78rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'fadeIn 250ms ease-out',
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.82rem',
              marginBottom: 4,
              color: coverageColor(selectedNode.coverage),
            }}
          >
            {selectedNode.id}
          </div>
          <div
            style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 8 }}
          >
            Ring {selectedNode.ring} · {selectedNode.lines} lines ·{' '}
            {Math.round(selectedNode.coverage * 100)}% covered
          </div>
          <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
            <strong style={{ color: '#94a3b8' }}>Functions:</strong>{' '}
            {selectedNode.functions.map((fn, i) => (
              <span key={fn}>
                <code
                  style={{
                    color: '#06b6d4',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {fn}
                </code>
                {i < selectedNode.functions.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            aria-label="Close node details"
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
