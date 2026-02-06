import { useState, useMemo } from "react";
import { Table2, Key, Link2, ChevronRight, ChevronDown, ArrowDown, Layers, Zap } from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface TimelineViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

export function TimelineView({ schema, searchQuery, onTableClick }: TimelineViewProps) {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const levels = useMemo(() => {
    const deps: Record<string, Set<string>> = {};
    schema.tables.forEach(t => { deps[t.name] = new Set(); });
    schema.foreignKeys.forEach(fk => {
      if (deps[fk.sourceTable]) deps[fk.sourceTable].add(fk.targetTable);
    });

    const levels: TableInfo[][] = [];
    const placed = new Set<string>();

    while (placed.size < schema.tables.length) {
      const level: TableInfo[] = [];
      schema.tables.forEach(t => {
        if (placed.has(t.name)) return;
        const unmet = [...(deps[t.name] || [])].filter(d => !placed.has(d));
        if (unmet.length === 0) level.push(t);
      });
      if (level.length === 0) {
        schema.tables.forEach(t => { if (!placed.has(t.name)) level.push(t); });
      }
      level.forEach(t => placed.add(t.name));
      levels.push(level);
    }
    return levels;
  }, [schema]);

  // Build dependency info per table
  const tableDeps = useMemo(() => {
    const deps: Record<string, { dependsOn: string[]; dependedBy: string[] }> = {};
    schema.tables.forEach(t => { deps[t.name] = { dependsOn: [], dependedBy: [] }; });
    schema.foreignKeys.forEach(fk => {
      deps[fk.sourceTable]?.dependsOn.push(fk.targetTable);
      deps[fk.targetTable]?.dependedBy.push(fk.sourceTable);
    });
    return deps;
  }, [schema]);

  const query = searchQuery.toLowerCase();
  const levelColors = [
    "border-primary/50 bg-primary/5",
    "border-info/50 bg-info/5",
    "border-success/50 bg-success/5",
    "border-warning/50 bg-warning/5",
    "border-destructive/50 bg-destructive/5",
  ];
  const dotColors = ["bg-primary", "bg-info", "bg-success", "bg-warning", "bg-destructive"];
  const levelDescriptions = [
    "Root tables — no foreign key dependencies. These are your foundation entities.",
    "First-level dependents — reference root tables only.",
    "Second-level dependents — deeper in the dependency chain.",
    "Third-level dependents — complex entities with multi-layer dependencies.",
    "Deep dependents — at the edge of the dependency graph.",
  ];

  // Find highlighted table connections
  const highlightedDeps = hoveredTable ? tableDeps[hoveredTable] : null;

  return (
    <div className="h-full flex">
      {/* Main timeline */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-6 max-w-[900px] mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Dependency Depth Map</h2>
            </div>
            <p className="text-sm text-muted-foreground">Tables organized by dependency depth. Hover to see connections.</p>
          </div>

          {/* Summary stats */}
          <div className="flex gap-3 mb-6">
            {levels.map((level, i) => (
              <button
                key={i}
                onClick={() => setExpandedLevel(expandedLevel === i ? null : i)}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  expandedLevel === i ? levelColors[i % levelColors.length] : "border-border/30 bg-card/50 hover:border-border/60"
                }`}
              >
                <p className="text-lg font-bold text-foreground">{level.length}</p>
                <p className="text-[10px] text-muted-foreground">Depth {i}</p>
              </button>
            ))}
          </div>

          {/* Vertical timeline */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/30" />

            {levels.map((level, i) => {
              const filtered = level.filter(t => !query || t.name.toLowerCase().includes(query));
              if (filtered.length === 0) return null;
              const isExpanded = expandedLevel === i;

              return (
                <div key={i} className="relative mb-8">
                  {/* Level dot + header */}
                  <button
                    className="flex items-center gap-3 mb-3 group"
                    onClick={() => setExpandedLevel(isExpanded ? null : i)}
                  >
                    <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      dotColors[i % dotColors.length]
                    } border-background shadow-md`}>
                      <span className="text-xs font-bold text-primary-foreground">{i}</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        Depth {i} — {filtered.length} table{filtered.length !== 1 ? "s" : ""}
                      </span>
                      <p className="text-[10px] text-muted-foreground">{levelDescriptions[Math.min(i, levelDescriptions.length - 1)]}</p>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />}
                  </button>

                  {/* Table cards */}
                  <div className="ml-14 grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {filtered.map(table => {
                      const deps = tableDeps[table.name];
                      const isHovered = hoveredTable === table.name;
                      const isConnected = highlightedDeps &&
                        (highlightedDeps.dependsOn.includes(table.name) || highlightedDeps.dependedBy.includes(table.name));
                      const pks = table.columns.filter(c => c.isPrimaryKey);
                      const fks = table.columns.filter(c => c.isForeignKey);

                      return (
                        <button
                          key={table.name}
                          className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                            isHovered
                              ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/5 scale-[1.02]"
                              : isConnected
                              ? "border-info/50 bg-info/5 shadow-md"
                              : "border-border/30 bg-card/50 hover:border-border/60"
                          }`}
                          onClick={() => onTableClick(table)}
                          onMouseEnter={() => setHoveredTable(table.name)}
                          onMouseLeave={() => setHoveredTable(null)}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Table2 className={`h-3.5 w-3.5 ${isConnected ? "text-info" : "text-primary"}`} />
                            <span className="text-xs font-semibold text-foreground truncate">{table.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{table.columns.length} cols</span>
                            {pks.length > 0 && <span className="text-warning">{pks.length} PK</span>}
                            {fks.length > 0 && <span className="text-info">{fks.length} FK</span>}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                              {deps?.dependsOn.length > 0 && (
                                <p className="text-[9px] text-muted-foreground">
                                  <span className="text-info">↑</span> {deps.dependsOn.join(", ")}
                                </p>
                              )}
                              {deps?.dependedBy.length > 0 && (
                                <p className="text-[9px] text-muted-foreground">
                                  <span className="text-warning">↓</span> {deps.dependedBy.join(", ")}
                                </p>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Arrow between levels */}
                  {i < levels.length - 1 && (
                    <div className="flex justify-center ml-14 my-3">
                      <ArrowDown className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover detail sidebar */}
      {hoveredTable && (
        <div className="w-56 border-l border-border/30 bg-card/30 p-4 shrink-0 animate-in slide-in-from-right-2 duration-200">
          <h3 className="text-xs font-semibold text-foreground mb-3">{hoveredTable}</h3>

          {highlightedDeps && (
            <>
              {highlightedDeps.dependsOn.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-info mb-1.5">Depends on ({highlightedDeps.dependsOn.length})</p>
                  {highlightedDeps.dependsOn.map(d => (
                    <div key={d} className="text-[10px] text-muted-foreground py-0.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-info" />
                      {d}
                    </div>
                  ))}
                </div>
              )}
              {highlightedDeps.dependedBy.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-warning mb-1.5">Depended by ({highlightedDeps.dependedBy.length})</p>
                  {highlightedDeps.dependedBy.map(d => (
                    <div key={d} className="text-[10px] text-muted-foreground py-0.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-warning" />
                      {d}
                    </div>
                  ))}
                </div>
              )}
              {highlightedDeps.dependsOn.length === 0 && highlightedDeps.dependedBy.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No direct relationships</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
