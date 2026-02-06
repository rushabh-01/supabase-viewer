import { useMemo, useState, useCallback } from "react";
import { Key, Link2, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface SwimlaneViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick?: (table: TableInfo) => void;
}

const LANE_COLORS = [
  { bg: "hsl(250 80% 68% / 0.08)", border: "hsl(250 80% 68% / 0.3)", header: "hsl(250 80% 68% / 0.15)", text: "hsl(250, 80%, 68%)", dot: "hsl(250, 80%, 68%)" },
  { bg: "hsl(210 80% 60% / 0.08)", border: "hsl(210 80% 60% / 0.3)", header: "hsl(210 80% 60% / 0.15)", text: "hsl(210, 80%, 60%)", dot: "hsl(210, 80%, 60%)" },
  { bg: "hsl(160 60% 45% / 0.08)", border: "hsl(160 60% 45% / 0.3)", header: "hsl(160 60% 45% / 0.15)", text: "hsl(160, 60%, 45%)", dot: "hsl(160, 60%, 45%)" },
  { bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.3)", header: "hsl(38 92% 60% / 0.15)", text: "hsl(38, 92%, 60%)", dot: "hsl(38, 92%, 60%)" },
  { bg: "hsl(0 72% 56% / 0.08)", border: "hsl(0 72% 56% / 0.3)", header: "hsl(0 72% 56% / 0.15)", text: "hsl(0, 72%, 56%)", dot: "hsl(0, 72%, 56%)" },
  { bg: "hsl(280 65% 60% / 0.08)", border: "hsl(280 65% 60% / 0.3)", header: "hsl(280 65% 60% / 0.15)", text: "hsl(280, 65%, 60%)", dot: "hsl(280, 65%, 60%)" },
  { bg: "hsl(180 50% 50% / 0.08)", border: "hsl(180 50% 50% / 0.3)", header: "hsl(180 50% 50% / 0.15)", text: "hsl(180, 50%, 50%)", dot: "hsl(180, 50%, 50%)" },
];

export function SwimlaneView({ schema, searchQuery, onTableClick }: SwimlaneViewProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const lanes = useMemo(() => {
    const tables = schema.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Union-Find to group related tables
    const parent: Record<string, string> = {};
    const find = (x: string): string => {
      if (!parent[x]) parent[x] = x;
      return parent[x] === x ? x : (parent[x] = find(parent[x]));
    };
    const union = (a: string, b: string) => { parent[find(a)] = find(b); };

    tables.forEach(t => { parent[t.name] = t.name; });
    schema.foreignKeys.forEach(fk => {
      if (tables.find(t => t.name === fk.sourceTable) && tables.find(t => t.name === fk.targetTable)) {
        union(fk.sourceTable, fk.targetTable);
      }
    });

    const groups: Record<string, TableInfo[]> = {};
    tables.forEach(t => {
      const root = find(t.name);
      if (!groups[root]) groups[root] = [];
      groups[root].push(t);
    });

    // Sort lanes by size (largest first), and tables within lanes alphabetically
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([root, members], i) => ({
        id: root,
        name: getLaneName(root, members, schema),
        tables: members.sort((a, b) => a.name.localeCompare(b.name)),
        color: LANE_COLORS[i % LANE_COLORS.length],
      }));
  }, [schema, searchQuery]);

  // Get relationships for a table
  const getRelationships = useCallback((tableName: string) => {
    return schema.foreignKeys.filter(fk => fk.sourceTable === tableName || fk.targetTable === tableName);
  }, [schema.foreignKeys]);

  return (
    <ScrollArea className="w-full h-full">
      <div className="p-6 space-y-0 min-w-[800px]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Swimlane Diagram</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tables organized into lanes by domain relationship · {lanes.length} lanes · {schema.tables.length} tables
          </p>
        </div>

        {/* Swimlane container */}
        <div className="rounded-xl border border-border/40 overflow-hidden">
          {lanes.map((lane, laneIdx) => (
            <div key={lane.id} className={laneIdx > 0 ? "border-t border-border/40" : ""}>
              {/* Lane row */}
              <div className="flex min-h-[140px]">
                {/* Lane header - vertical label on left */}
                <div
                  className="w-[180px] shrink-0 flex flex-col items-center justify-center p-4 border-r border-border/40"
                  style={{ backgroundColor: lane.color.header }}
                >
                  <div
                    className="w-3 h-3 rounded-full mb-2"
                    style={{ backgroundColor: lane.color.dot }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-center leading-tight"
                    style={{ color: lane.color.text }}
                  >
                    {lane.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {lane.tables.length} {lane.tables.length === 1 ? "table" : "tables"}
                  </span>
                </div>

                {/* Lane content - tables arranged horizontally */}
                <div
                  className="flex-1 p-4 flex flex-wrap gap-3 items-start"
                  style={{ backgroundColor: lane.color.bg }}
                >
                  {lane.tables.map(table => {
                    const isHovered = hoveredTable === table.name;
                    const rels = getRelationships(table.name);
                    const cols = table.columns.slice(0, 6);

                    return (
                      <div
                        key={table.name}
                        className="rounded-lg border bg-card shadow-sm transition-all duration-200 cursor-pointer w-[240px]"
                        style={{
                          borderColor: isHovered ? lane.color.dot : "hsl(var(--border) / 0.4)",
                          boxShadow: isHovered ? `0 0 12px ${lane.color.dot}30` : undefined,
                        }}
                        onMouseEnter={() => setHoveredTable(table.name)}
                        onMouseLeave={() => setHoveredTable(null)}
                        onClick={() => onTableClick?.(table)}
                      >
                        {/* Table header */}
                        <div
                          className="px-3 py-2.5 border-b rounded-t-lg flex items-center justify-between"
                          style={{ borderColor: "hsl(var(--border) / 0.3)", backgroundColor: lane.color.header }}
                        >
                          <span className="text-xs font-semibold text-foreground">{table.name}</span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: lane.color.dot + "20", color: lane.color.text }}
                          >
                            {table.columns.length} cols
                          </span>
                        </div>

                        {/* Columns */}
                        <div className="py-1">
                          {cols.map(col => (
                            <div key={col.name} className="flex items-center gap-1.5 px-3 py-0.5 text-[10px]">
                              {col.isPrimaryKey && <Key className="h-2.5 w-2.5 text-warning shrink-0" />}
                              {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-2.5 w-2.5 text-info shrink-0" />}
                              {!col.isPrimaryKey && !col.isForeignKey && <span className="w-2.5 shrink-0" />}
                              <span className="text-foreground/80 truncate">{col.name}</span>
                              <span className="ml-auto font-mono text-muted-foreground/50 shrink-0">{col.dataType}</span>
                            </div>
                          ))}
                          {table.columns.length > 6 && (
                            <div className="px-3 py-0.5 text-[9px] text-muted-foreground/40">
                              +{table.columns.length - 6} more
                            </div>
                          )}
                        </div>

                        {/* Relationships indicator */}
                        {rels.length > 0 && (
                          <div className="px-3 py-1.5 border-t border-border/20 flex items-center gap-1">
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground/50">{rels.length} relationship{rels.length !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function getLaneName(root: string, members: TableInfo[], schema: SchemaData): string {
  // Try to find a meaningful group name
  const names = members.map(m => m.name.toLowerCase());
  
  // Common domain patterns
  const patterns = [
    { keywords: ["user", "profile", "auth", "account", "role", "permission"], label: "Users & Auth" },
    { keywords: ["order", "cart", "payment", "invoice", "transaction", "checkout"], label: "Orders & Payments" },
    { keywords: ["product", "item", "catalog", "category", "inventory"], label: "Products & Catalog" },
    { keywords: ["post", "comment", "article", "blog", "content", "media"], label: "Content" },
    { keywords: ["message", "notification", "email", "chat"], label: "Communication" },
    { keywords: ["setting", "config", "preference", "option"], label: "Configuration" },
    { keywords: ["log", "event", "audit", "history", "analytics"], label: "Logging & Analytics" },
  ];

  for (const pattern of patterns) {
    if (names.some(n => pattern.keywords.some(k => n.includes(k)))) {
      return pattern.label;
    }
  }

  // Fall back to the root table name as the domain
  if (members.length === 1) return root;
  return `${root} Domain`;
}
