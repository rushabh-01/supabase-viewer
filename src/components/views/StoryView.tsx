import { useState, useMemo } from "react";
import {
  ArrowRight, Table2, ChevronRight, ChevronDown, Link2, Database,
  Sparkles, BookOpen, Key, ArrowDown, MessageSquare, Lightbulb, Layers,
} from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";

interface StoryViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

interface StoryChapter {
  title: string;
  narrative: string;
  insight: string;
  tables: TableInfo[];
  relationships: { from: string; to: string; via: string; explanation: string }[];
  rootTable: TableInfo;
}

function generateNarrative(tables: TableInfo[], rels: { from: string; to: string; via: string }[], rootTable: TableInfo): { narrative: string; insight: string } {
  const totalCols = tables.reduce((a, t) => a + t.columns.length, 0);
  const fkCount = rels.length;

  if (tables.length === 1) {
    const t = tables[0];
    const pks = t.columns.filter(c => c.isPrimaryKey);
    return {
      narrative: `"${t.name}" stands alone as an independent entity with ${t.columns.length} attributes. ${
        pks.length > 0 ? `It's uniquely identified by ${pks.map(p => p.name).join(", ")}.` : "It has no explicit primary key."
      } Without foreign key connections, this table likely serves as a configuration store, lookup reference, or standalone record.`,
      insight: `Consider whether "${t.name}" could benefit from being linked to other entities. Standalone tables sometimes indicate missing relationships or serve as system-level configuration.`,
    };
  }

  const leafTables = tables.filter(t => !rels.some(r => r.to === t.name));
  const hubTables = tables.filter(t => {
    const asTarget = rels.filter(r => r.to === t.name).length;
    return asTarget >= 2;
  });

  const narrative = `This story begins with "${rootTable.name}", which anchors a cluster of ${tables.length} interconnected tables spanning ${totalCols} total columns. ${
    fkCount > 0 ? `Data flows through ${fkCount} foreign key relationship${fkCount > 1 ? "s" : ""}, ` : ""
  }${hubTables.length > 0 ? `with ${hubTables.map(h => `"${h.name}"`).join(" and ")} serving as central hub${hubTables.length > 1 ? "s" : ""} that multiple tables reference. ` : ""}${
    leafTables.length > 0 ? `The outermost entities — ${leafTables.slice(0, 3).map(l => `"${l.name}"`).join(", ")}${leafTables.length > 3 ? ` and ${leafTables.length - 3} more` : ""} — sit at the edges, consuming data from the core.` : ""
  }`;

  const insight = hubTables.length > 0
    ? `The hub table${hubTables.length > 1 ? "s" : ""} ${hubTables.map(h => `"${h.name}"`).join(", ")} ${hubTables.length > 1 ? "are" : "is"} critical — changes here cascade to ${leafTables.length} dependent ${leafTables.length === 1 ? "table" : "tables"}. Consider indexing foreign keys for query performance.`
    : `This cluster has a flat structure with no clear hub. Consider denormalization if join queries are frequent.`;

  return { narrative, insight };
}

function explainRelationship(from: string, to: string, via: string): string {
  const [srcCol, , tgtCol] = via.split(" ");
  if (srcCol?.includes("id") && tgtCol?.includes("id")) {
    return `"${from}" references "${to}" through a foreign key, establishing a parent-child relationship.`;
  }
  return `Data flows from "${from}" to "${to}" via the ${via} link.`;
}

export function StoryView({ schema, searchQuery, onTableClick }: StoryViewProps) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showAllCols, setShowAllCols] = useState<Set<string>>(new Set());

  const chapters = useMemo(() => {
    const adj: Record<string, Set<string>> = {};
    schema.tables.forEach(t => { adj[t.name] = new Set(); });
    schema.foreignKeys.forEach(fk => {
      adj[fk.sourceTable]?.add(fk.targetTable);
      adj[fk.targetTable]?.add(fk.sourceTable);
    });

    const visited = new Set<string>();
    const clusters: string[][] = [];
    const bfs = (start: string) => {
      const queue = [start];
      const cluster: string[] = [];
      visited.add(start);
      while (queue.length) {
        const node = queue.shift()!;
        cluster.push(node);
        adj[node]?.forEach(neighbor => {
          if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
        });
      }
      return cluster;
    };
    schema.tables.forEach(t => { if (!visited.has(t.name)) clusters.push(bfs(t.name)); });
    clusters.sort((a, b) => b.length - a.length);

    const tableMap = Object.fromEntries(schema.tables.map(t => [t.name, t]));

    return clusters.map((cluster, i) => {
      const tables = cluster.map(n => tableMap[n]).filter(Boolean);
      const rels = schema.foreignKeys
        .filter(fk => cluster.includes(fk.sourceTable) && cluster.includes(fk.targetTable))
        .map(fk => ({
          from: fk.sourceTable,
          to: fk.targetTable,
          via: `${fk.sourceColumn} → ${fk.targetColumn}`,
          explanation: explainRelationship(fk.sourceTable, fk.targetTable, `${fk.sourceColumn} → ${fk.targetColumn}`),
        }));

      const rootTables = tables.filter(t =>
        !schema.foreignKeys.some(fk => fk.sourceTable === t.name && cluster.includes(fk.targetTable))
      );
      const rootTable = rootTables[0] || tables[0];

      const title = cluster.length === 1
        ? `The "${cluster[0]}" Entity`
        : `The ${rootTable.name} Ecosystem`;

      const { narrative, insight } = generateNarrative(tables, rels, rootTable);

      return { title, narrative, insight, tables, relationships: rels, rootTable } as StoryChapter;
    });
  }, [schema]);

  const filtered = chapters.filter(ch =>
    !searchQuery || ch.tables.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const current = filtered[activeChapter] || filtered[0];

  if (!current) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No data stories found.</p>
      </div>
    );
  }

  const toggleShowAll = (name: string) => {
    setShowAllCols(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="h-full flex">
      {/* Chapter nav */}
      <div className="w-60 border-r border-border/30 bg-card/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Data Story</h2>
          </div>
          <p className="text-[10px] text-muted-foreground">{filtered.length} chapter{filtered.length !== 1 ? "s" : ""} · {schema.tables.length} tables</p>
        </div>
        <div className="flex-1 overflow-auto min-h-0 p-2 space-y-1">
          {filtered.map((ch, i) => (
            <button
              key={i}
              onClick={() => { setActiveChapter(i); setExpandedTable(null); }}
              className={`w-full text-left px-3 py-3 rounded-lg text-xs transition-all ${
                activeChapter === i
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${activeChapter === i ? "text-primary" : "opacity-40"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium truncate flex-1">{ch.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] opacity-60">
                <span>{ch.tables.length} tables</span>
                <span>·</span>
                <span>{ch.relationships.length} links</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Story content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-8 max-w-[750px] mx-auto">
          {/* Chapter header */}
          <div className="mb-8">
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
              Chapter {activeChapter + 1} of {filtered.length}
            </span>
            <h1 className="text-2xl font-bold text-foreground mt-2 mb-4">{current.title}</h1>

            {/* Narrative block */}
            <div className="relative pl-4 border-l-2 border-primary/30 mb-6">
              <MessageSquare className="absolute -left-[11px] top-0 h-5 w-5 text-primary bg-background rounded" />
              <p className="text-sm text-foreground/80 leading-relaxed pt-0.5">{current.narrative}</p>
            </div>

            {/* Insight */}
            <div className="flex gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/70 leading-relaxed">{current.insight}</p>
            </div>
          </div>

          {/* Relationship flow — visual storytelling */}
          {current.relationships.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Data Flow Narrative
              </h3>
              <div className="space-y-3">
                {current.relationships.map((rel, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                      <button
                        onClick={() => { const t = schema.tables.find(t => t.name === rel.from); if (t) onTableClick(t); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <Table2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{rel.from}</span>
                      </button>

                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                        <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap px-2 py-0.5 bg-secondary/50 rounded">
                          {rel.via}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-info/40 to-transparent" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      </div>

                      <button
                        onClick={() => { const t = schema.tables.find(t => t.name === rel.to); if (t) onTableClick(t); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-info/10 hover:bg-info/20 transition-colors shrink-0"
                      >
                        <Table2 className="h-3.5 w-3.5 text-info" />
                        <span className="text-xs font-semibold text-foreground">{rel.to}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 ml-3 italic">{rel.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity cards with detailed breakdown */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Entity Profiles
            </h3>
            <div className="space-y-3">
              {current.tables.map(table => {
                const isExpanded = expandedTable === table.name;
                const pks = table.columns.filter(c => c.isPrimaryKey);
                const fks = table.columns.filter(c => c.isForeignKey);
                const regular = table.columns.filter(c => !c.isPrimaryKey && !c.isForeignKey);
                const isRoot = table.name === current.rootTable.name;
                const inRels = current.relationships.filter(r => r.to === table.name).length;
                const outRels = current.relationships.filter(r => r.from === table.name).length;
                const allCols = showAllCols.has(table.name);

                return (
                  <div
                    key={table.name}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
                        : isRoot
                        ? "border-primary/20 bg-card/80"
                        : "border-border/30 bg-card/50 hover:border-border/60"
                    }`}
                  >
                    <button
                      className="flex items-center gap-3 w-full p-4 text-left"
                      onClick={() => setExpandedTable(isExpanded ? null : table.name)}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                        isRoot ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                      }`}>
                        <Database className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{table.name}</p>
                          {isRoot && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">root</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{table.columns.length} columns</span>
                          {pks.length > 0 && <span className="text-warning">{pks.length} PK</span>}
                          {fks.length > 0 && <span className="text-info">{fks.length} FK</span>}
                          {inRels > 0 && <span>← {inRels} incoming</span>}
                          {outRels > 0 && <span>→ {outRels} outgoing</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                        {/* Column groups */}
                        {pks.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-warning mb-1.5 flex items-center gap-1.5">
                              <Key className="h-3 w-3" /> Primary Keys
                            </p>
                            {pks.map(col => (
                              <div key={col.name} className="flex items-center gap-2 text-xs py-0.5 ml-4">
                                <span className="text-foreground font-medium">{col.name}</span>
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{col.dataType}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {fks.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-info mb-1.5 flex items-center gap-1.5">
                              <Link2 className="h-3 w-3" /> Foreign Keys
                            </p>
                            {fks.map(col => (
                              <div key={col.name} className="flex items-center gap-2 text-xs py-0.5 ml-4">
                                <span className="text-foreground font-medium">{col.name}</span>
                                {col.references && (
                                  <span className="text-[10px] text-info/60">→ {col.references.table}.{col.references.column}</span>
                                )}
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{col.dataType}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {regular.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Attributes</p>
                            {(allCols ? regular : regular.slice(0, 5)).map(col => (
                              <div key={col.name} className="flex items-center gap-2 text-xs py-0.5 ml-4">
                                <span className="text-foreground/70">{col.name}</span>
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{col.dataType}</span>
                                {col.isNullable && <span className="text-[9px] text-muted-foreground/40">null</span>}
                              </div>
                            ))}
                            {regular.length > 5 && !allCols && (
                              <button
                                className="text-[10px] text-primary hover:text-primary/80 ml-4 mt-1"
                                onClick={(e) => { e.stopPropagation(); toggleShowAll(table.name); }}
                              >
                                Show {regular.length - 5} more →
                              </button>
                            )}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onTableClick(table); }}
                          className="w-full text-[10px] text-primary hover:text-primary/80 font-medium py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors mt-2"
                        >
                          View live data →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chapter stats */}
          <div className="flex gap-4 p-4 rounded-xl bg-secondary/20 border border-border/20">
            <div className="text-center flex-1">
              <p className="text-xl font-bold text-foreground">{current.tables.length}</p>
              <p className="text-[10px] text-muted-foreground">Tables</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-bold text-foreground">{current.relationships.length}</p>
              <p className="text-[10px] text-muted-foreground">Relationships</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-bold text-foreground">{current.tables.reduce((a, t) => a + t.columns.length, 0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Columns</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-bold text-foreground">
                {current.tables.reduce((a, t) => a + t.columns.filter(c => c.isForeignKey).length, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Foreign Keys</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
