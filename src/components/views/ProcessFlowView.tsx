import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface ProcessFlowViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick?: (table: TableInfo) => void;
}

interface FlowNode {
  table: TableInfo;
  level: number;
  x: number;
  y: number;
}

interface FlowEdge {
  from: string;
  to: string;
  sourceCol: string;
  targetCol: string;
}

export function ProcessFlowView({ schema, searchQuery, onTableClick }: ProcessFlowViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const NODE_W = 220, NODE_H = 60;

  const { nodes, edges } = useMemo(() => {
    const tables = schema.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Topological sort into levels
    const deps: Record<string, Set<string>> = {};
    tables.forEach(t => { deps[t.name] = new Set(); });
    schema.foreignKeys.forEach(fk => {
      if (deps[fk.sourceTable]) deps[fk.sourceTable].add(fk.targetTable);
    });

    const levels: string[][] = [];
    const placed = new Set<string>();
    while (placed.size < tables.length) {
      const level: string[] = [];
      tables.forEach(t => {
        if (placed.has(t.name)) return;
        const unmet = [...(deps[t.name] || [])].filter(d => !placed.has(d));
        if (unmet.length === 0) level.push(t.name);
      });
      if (level.length === 0) {
        tables.forEach(t => { if (!placed.has(t.name)) level.push(t.name); });
      }
      level.forEach(n => placed.add(n));
      levels.push(level);
    }

    const GAP_X = 80, GAP_Y = 120;
    const tableMap = Object.fromEntries(tables.map(t => [t.name, t]));
    const nodes: FlowNode[] = [];

    levels.forEach((level, li) => {
      const totalWidth = level.length * NODE_W + (level.length - 1) * GAP_X;
      const startX = -totalWidth / 2;
      level.forEach((name, idx) => {
        if (tableMap[name]) {
          nodes.push({ table: tableMap[name], level: li, x: startX + idx * (NODE_W + GAP_X), y: li * (NODE_H + GAP_Y) });
        }
      });
    });

    const tableSet = new Set(tables.map(t => t.name));
    const edges: FlowEdge[] = schema.foreignKeys
      .filter(fk => tableSet.has(fk.sourceTable) && tableSet.has(fk.targetTable))
      .map(fk => ({ from: fk.targetTable, to: fk.sourceTable, sourceCol: fk.targetColumn, targetCol: fk.sourceColumn }));

    return { nodes, edges };
  }, [schema, searchQuery]);

  // Auto-fit
  useEffect(() => {
    if (containerRef.current && nodes.length > 0) {
      const c = containerRef.current;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x + NODE_W);
        minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y + NODE_H);
      });
      const pad = 80;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      const s = Math.min(c.clientWidth / w, c.clientHeight / h, 1) * 0.85;
      setZoom(s);
      setPan({
        x: c.clientWidth / 2 - ((minX + maxX) / 2) * s,
        y: c.clientHeight / 2 - ((minY + maxY) / 2) * s,
      });
    }
  }, [nodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const nz = Math.max(0.1, Math.min(3, zoom * factor));
    setPan(p => ({ x: mx - (mx - p.x) * (nz / zoom), y: my - (my - p.y) * (nz / zoom) }));
    setZoom(nz);
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);
  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.table.name, n]));

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-background relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: "1px", height: "1px" }}
      >
        <svg width="1" height="1" overflow="visible" style={{ position: "absolute", top: 0, left: 0 }}>
          <defs>
            <marker id="pf-arrow" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 12 6 L 0 12 z" fill="hsl(var(--primary) / 0.6)" />
            </marker>
            <marker id="pf-arrow-active" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 12 6 L 0 12 z" fill="hsl(var(--primary))" />
            </marker>
            <filter id="pf-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(0 0% 0% / 0.4)" />
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap[edge.from], to = nodeMap[edge.to];
            if (!from || !to) return null;
            const sx = from.x + NODE_W / 2, sy = from.y + NODE_H;
            const tx = to.x + NODE_W / 2, ty = to.y;
            const my = (sy + ty) / 2;
            const isActive = hoveredNode === edge.from || hoveredNode === edge.to;

            return (
              <g key={i}>
                <path
                  d={`M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                  fill="none"
                  stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  markerEnd={isActive ? "url(#pf-arrow-active)" : "url(#pf-arrow)"}
                />
                {isActive && (
                  <text x={(sx + tx) / 2} y={my - 6} textAnchor="middle" fontSize={9} fill="hsl(var(--primary))" fontFamily="monospace">
                    {edge.sourceCol} → {edge.targetCol}
                  </text>
                )}
              </g>
            );
          })}

          {/* Level labels */}
          {Array.from(new Set(nodes.map(n => n.level))).map(level => {
            const levelNodes = nodes.filter(n => n.level === level);
            const minX = Math.min(...levelNodes.map(n => n.x));
            return (
              <text key={`l-${level}`} x={minX - 40} y={levelNodes[0].y + NODE_H / 2 + 4} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground) / 0.3)" fontWeight={600} fontFamily="system-ui">
                L{level}
              </text>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNode === node.table.name;
            const pkCount = node.table.columns.filter(c => c.isPrimaryKey).length;
            const fkCount = node.table.columns.filter(c => c.isForeignKey).length;
            const levelColor = node.level === 0 ? "hsl(var(--success))" : node.level === 1 ? "hsl(var(--primary))" : "hsl(var(--info))";

            return (
              <g
                key={node.table.name}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.table.name)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onTableClick?.(node.table)}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_W} height={NODE_H} rx={10} ry={10}
                  fill="hsl(var(--card))"
                  stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)"}
                  strokeWidth={isHovered ? 2 : 1}
                  filter="url(#pf-shadow)"
                />
                <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={levelColor} />
                <text x={16} y={24} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))" fontFamily="system-ui, sans-serif">
                  {node.table.name}
                </text>
                <text x={16} y={42} fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="system-ui, sans-serif">
                  {node.table.columns.length} columns · {pkCount} PK · {fkCount} FK
                </text>
                <circle cx={NODE_W / 2} cy={0} r={3.5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />
                <circle cx={NODE_W / 2} cy={NODE_H} r={3.5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 text-xs space-y-1.5 z-10">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Process Flow</p>
        <div className="flex items-center gap-2"><div className="w-3 h-1 rounded bg-success" /><span className="text-foreground/60">Level 0 — Root</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 rounded bg-primary" /><span className="text-foreground/60">Level 1</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 rounded bg-info" /><span className="text-foreground/60">Level 2+</span></div>
      </div>

      <div className="absolute bottom-4 right-4 glass rounded-lg overflow-hidden flex flex-col z-10">
        <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="px-3 py-2 text-xs text-foreground hover:bg-secondary/30 transition-colors">+</button>
        <div className="border-t border-border/30" />
        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="px-3 py-2 text-xs text-foreground hover:bg-secondary/30 transition-colors">−</button>
        <div className="border-t border-border/30" />
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-3 py-2 text-[10px] text-muted-foreground hover:bg-secondary/30 transition-colors">Reset</button>
      </div>
    </div>
  );
}
