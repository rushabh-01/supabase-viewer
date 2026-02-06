import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { stratify, tree } from "d3-hierarchy";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface HierarchyViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick?: (table: TableInfo) => void;
}

interface TreeNode {
  id: string;
  parentId: string | null;
  table: TableInfo;
}

export function HierarchyView({ schema, searchQuery, onTableClick }: HierarchyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const treeData = useMemo(() => {
    const tables = schema.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const parentMap: Record<string, string> = {};
    schema.foreignKeys.forEach(fk => {
      if (!parentMap[fk.sourceTable]) parentMap[fk.sourceTable] = fk.targetTable;
    });

    const roots = tables.filter(t => !parentMap[t.name]);
    if (roots.length === 0 && tables.length > 0) return null;

    const nodes: TreeNode[] = [];
    const virtualRoot = "__root__";

    if (roots.length > 1) {
      nodes.push({ id: virtualRoot, parentId: null, table: { name: "Schema", schema: "public", columns: [] } });
      roots.forEach(t => nodes.push({ id: t.name, parentId: virtualRoot, table: t }));
    } else if (roots.length === 1) {
      nodes.push({ id: roots[0].name, parentId: null, table: roots[0] });
    }

    tables.forEach(t => {
      if (nodes.find(n => n.id === t.name)) return;
      const parent = parentMap[t.name];
      if (parent && tables.find(tt => tt.name === parent)) {
        nodes.push({ id: t.name, parentId: parent, table: t });
      } else {
        nodes.push({ id: t.name, parentId: roots.length > 1 ? virtualRoot : roots[0]?.name || null, table: t });
      }
    });

    return nodes;
  }, [schema, searchQuery]);

  const layout = useMemo(() => {
    if (!treeData) return null;
    try {
      const root = stratify<TreeNode>().id(d => d.id).parentId(d => d.parentId)(treeData);
      const NODE_W = 220, NODE_H = 52;
      const treeLayout = tree<TreeNode>()
        .nodeSize([NODE_W + 40, NODE_H + 90])
        .separation((a, b) => a.parent === b.parent ? 1.1 : 1.5);

      const laid = treeLayout(root);
      return { nodes: laid.descendants(), links: laid.links(), NODE_W, NODE_H };
    } catch { return null; }
  }, [treeData]);

  // Auto-fit on load
  useEffect(() => {
    if (layout && containerRef.current) {
      const c = containerRef.current;
      const { nodes, NODE_W, NODE_H } = layout;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x - NODE_W / 2);
        maxX = Math.max(maxX, n.x + NODE_W / 2);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + NODE_H);
      });
      const pad = 80;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      const sx = c.clientWidth / w;
      const sy = c.clientHeight / h;
      const s = Math.min(sx, sy, 1) * 0.85;
      setZoom(s);
      setPan({
        x: c.clientWidth / 2 - ((minX + maxX) / 2) * s,
        y: c.clientHeight / 2 - ((minY + maxY) / 2) * s,
      });
    }
  }, [layout]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

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

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No hierarchical relationships found.</p>
      </div>
    );
  }

  const isVirtual = (id: string) => id === "__root__";
  const { NODE_W, NODE_H } = layout;
  const hasVirtualRoot = treeData!.some(n => n.id === "__root__");

  const depthColors = [
    { fill: "hsl(var(--primary) / 0.12)", stroke: "hsl(var(--primary) / 0.5)", accent: "hsl(var(--primary))" },
    { fill: "hsl(var(--info) / 0.1)", stroke: "hsl(var(--info) / 0.4)", accent: "hsl(var(--info))" },
    { fill: "hsl(var(--success) / 0.08)", stroke: "hsl(var(--success) / 0.35)", accent: "hsl(var(--success))" },
    { fill: "hsl(var(--warning) / 0.08)", stroke: "hsl(var(--warning) / 0.35)", accent: "hsl(var(--warning))" },
  ];

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
      {/* Use a div with transform instead of SVG transform to avoid clipping */}
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: "1px", height: "1px", // container itself is tiny, children overflow visibly
        }}
      >
        <svg
          width="1" height="1"
          overflow="visible"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            <filter id="h-shadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="hsl(0 0% 0% / 0.5)" />
            </filter>
          </defs>

          {/* Links - orthogonal step connectors */}
          {layout.links.map((link, i) => {
            if (isVirtual(link.source.data.id)) return null;
            const sx = link.source.x, sy = link.source.y + NODE_H;
            const tx = link.target.x, ty = link.target.y;
            const midY = sy + (ty - sy) * 0.5;
            const isActive = hoveredTable === link.source.data.id || hoveredTable === link.target.data.id;

            return (
              <g key={i}>
                <path
                  d={`M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`}
                  fill="none"
                  stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeLinejoin="round"
                  opacity={isActive ? 1 : 0.4}
                />
                {/* Arrow at target */}
                <polygon
                  points={`${tx - 4},${ty - 6} ${tx + 4},${ty - 6} ${tx},${ty}`}
                  fill={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  opacity={isActive ? 1 : 0.4}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map(node => {
            if (isVirtual(node.data.id)) return null;
            const table = node.data.table;
            const x = node.x - NODE_W / 2;
            const y = node.y;
            const isHovered = hoveredTable === node.data.id;
            const hasChildren = node.children && node.children.length > 0;
            const depth = node.depth - (hasVirtualRoot ? 1 : 0);
            const colors = depthColors[Math.min(depth, depthColors.length - 1)];
            const pkCols = table.columns.filter(c => c.isPrimaryKey);
            const fkCols = table.columns.filter(c => c.isForeignKey);

            return (
              <g
                key={node.data.id}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHoveredTable(node.data.id)}
                onMouseLeave={() => setHoveredTable(null)}
                onClick={() => onTableClick?.(table)}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_W} height={NODE_H} rx={8} ry={8}
                  fill={isHovered ? colors.fill : "hsl(var(--card))"}
                  stroke={isHovered ? colors.accent : colors.stroke}
                  strokeWidth={isHovered ? 2 : 1}
                  filter="url(#h-shadow)"
                />
                {/* Top accent */}
                <rect x={16} y={0} width={NODE_W - 32} height={2.5} rx={1.25} fill={colors.accent} opacity={0.6} />

                {/* Collapse toggle */}
                {hasChildren && (
                  <g
                    transform="translate(12, 18)"
                    onClick={e => { e.stopPropagation(); toggleCollapse(node.data.id); }}
                    className="cursor-pointer"
                  >
                    <rect x={-6} y={-6} width={12} height={12} rx={3} fill="hsl(var(--secondary))" />
                    <text fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle" dy="3" fontFamily="system-ui">
                      {collapsedNodes.has(node.data.id) ? "+" : "−"}
                    </text>
                  </g>
                )}

                {/* Table name */}
                <text
                  x={hasChildren ? 28 : 14} y={20}
                  fontSize={11} fontWeight={700}
                  fill="hsl(var(--foreground))"
                  fontFamily="system-ui, sans-serif"
                >
                  {table.name}
                </text>

                {/* Meta */}
                <text x={14} y={38} fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="system-ui, sans-serif">
                  {table.columns.length} cols
                  {pkCols.length > 0 && ` · ${pkCols.length} PK`}
                  {fkCols.length > 0 && ` · ${fkCols.length} FK`}
                </text>

                {/* Depth badge */}
                <g transform={`translate(${NODE_W - 28}, 12)`}>
                  <rect width={20} height={16} rx={8} fill={colors.accent} opacity={0.2} />
                  <text x={10} y={12} textAnchor="middle" fontSize={9} fill={colors.accent} fontWeight={700}>
                    D{depth}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 text-xs space-y-1.5 z-10">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hierarchy Tree</p>
        {depthColors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: c.accent }} />
            <span className="text-foreground/60">Depth {i}{i === 0 ? " — Root" : ""}</span>
          </div>
        ))}
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
