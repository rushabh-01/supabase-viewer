import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface NodeLinkViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick?: (table: TableInfo) => void;
}

interface GraphNode {
  id: string;
  table: TableInfo;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export function NodeLinkView({ schema, searchQuery, onTableClick }: NodeLinkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [settled, setSettled] = useState(false);

  const { nodes, links } = useMemo(() => {
    const tables = schema.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const connCount: Record<string, number> = {};
    tables.forEach(t => { connCount[t.name] = 0; });
    schema.foreignKeys.forEach(fk => {
      if (connCount[fk.sourceTable] !== undefined) connCount[fk.sourceTable]++;
      if (connCount[fk.targetTable] !== undefined) connCount[fk.targetTable]++;
    });

    const sorted = [...tables].sort((a, b) => (connCount[b.name] || 0) - (connCount[a.name] || 0));
    const nodes: GraphNode[] = sorted.map((table, i) => {
      if (i === 0) return { id: table.name, table, x: 0, y: 0, vx: 0, vy: 0, connections: connCount[table.name] || 0 };
      const ring = Math.ceil(i / 6);
      const posInRing = (i - 1) % (ring * 6);
      const angle = (posInRing / (ring * 6)) * Math.PI * 2 - Math.PI / 2;
      const radius = ring * 280;
      return { id: table.name, table, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0, connections: connCount[table.name] || 0 };
    });

    const tableSet = new Set(tables.map(t => t.name));
    const links: GraphLink[] = schema.foreignKeys
      .filter(fk => tableSet.has(fk.sourceTable) && tableSet.has(fk.targetTable))
      .map(fk => ({ source: fk.sourceTable, target: fk.targetTable, label: `${fk.sourceColumn} → ${fk.targetColumn}` }));

    return { nodes, links };
  }, [schema, searchQuery]);

  // Force simulation
  useEffect(() => {
    setSettled(false);
    const nodeMap: Record<string, GraphNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = { ...n }; });

    let iteration = 0;
    const maxIterations = 150;

    const simulate = () => {
      if (iteration >= maxIterations) { setSettled(true); return; }
      iteration++;

      const ns = Object.values(nodeMap);
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 10000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx -= fx; ns[i].vy -= fy;
          ns[j].vx += fx; ns[j].vy += fy;
        }
      }
      links.forEach(l => {
        const s = nodeMap[l.source], t = nodeMap[l.target];
        if (!s || !t) return;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 250) * 0.012;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        s.vx += fx; s.vy += fy;
        t.vx -= fx; t.vy -= fy;
      });
      ns.forEach(n => { n.vx -= n.x * 0.001; n.vy -= n.y * 0.001; });
      const damping = 0.82;
      ns.forEach(n => { n.vx *= damping; n.vy *= damping; n.x += n.vx; n.y += n.vy; });

      const pos: Record<string, { x: number; y: number }> = {};
      ns.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
      setPositions(pos);

      if (iteration < maxIterations) animRef.current = requestAnimationFrame(simulate);
      else setSettled(true);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, links]);

  // Auto-fit after settled
  useEffect(() => {
    if (settled && containerRef.current && Object.keys(positions).length > 0) {
      const c = containerRef.current;
      const vals = Object.values(positions);
      const minX = Math.min(...vals.map(p => p.x)) - 100;
      const maxX = Math.max(...vals.map(p => p.x)) + 100;
      const minY = Math.min(...vals.map(p => p.y)) - 100;
      const maxY = Math.max(...vals.map(p => p.y)) + 100;
      const w = maxX - minX, h = maxY - minY;
      const sx = c.clientWidth / w;
      const sy = c.clientHeight / h;
      const scale = Math.min(sx, sy, 1) * 0.8;
      setZoom(scale);
      setPan({
        x: c.clientWidth / 2 - ((minX + maxX) / 2) * scale,
        y: c.clientHeight / 2 - ((minY + maxY) / 2) * scale,
      });
    }
  }, [settled]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * factor));
    setPan(p => ({
      x: mx - (mx - p.x) * (newZoom / zoom),
      y: my - (my - p.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);
  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const getPos = (id: string) => positions[id] || { x: 0, y: 0 };
  const maxConn = Math.max(...nodes.map(n => n.connections), 1);

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
            <filter id="nl-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Links */}
          {links.map((link, i) => {
            const s = getPos(link.source), t = getPos(link.target);
            const isHighlighted = hoveredNode === link.source || hoveredNode === link.target;
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeOpacity={isHighlighted ? 1 : 0.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = getPos(node.id);
            const isHovered = hoveredNode === node.id;
            const radius = 28 + (node.connections / maxConn) * 26;
            const isConnected = hoveredNode && links.some(l =>
              (l.source === hoveredNode && l.target === node.id) ||
              (l.target === hoveredNode && l.source === node.id)
            );

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onTableClick?.(node.table)}
                className="cursor-pointer"
              >
                {(isHovered || isConnected) && (
                  <circle r={radius + 8} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeOpacity={0.25} filter="url(#nl-glow)" />
                )}
                <circle
                  r={radius}
                  fill={isHovered ? "hsl(var(--primary) / 0.15)" : "hsl(var(--card))"}
                  stroke={isHovered || isConnected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isHovered ? 2 : 1}
                />
                <text y={-5} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))" fontFamily="system-ui, sans-serif">
                  {node.table.name.length > 14 ? node.table.name.slice(0, 13) + "…" : node.table.name}
                </text>
                <text y={10} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="system-ui, sans-serif">
                  {node.table.columns.length} cols · {node.connections} links
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 text-xs space-y-1.5 z-10">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Node-Link Graph</p>
        <p className="text-foreground/60 text-[10px]">Node size = connection count</p>
        <p className="text-foreground/60 text-[10px]">Force-directed layout</p>
      </div>

      {/* Zoom controls */}
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
