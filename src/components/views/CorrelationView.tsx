import { useState, useMemo } from "react";
import { ArrowRight, Table2, Zap, BarChart3 } from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CorrelationViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

export function CorrelationView({ schema, searchQuery, onTableClick }: CorrelationViewProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const tables = schema.tables.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build connection matrix
  const { matrix, maxVal, connectionDetails } = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const connectionDetails: Record<string, { from: string; to: string; via: string }[]> = {};
    tables.forEach(t => { matrix[t.name] = {}; tables.forEach(t2 => { matrix[t.name][t2.name] = 0; }); });

    schema.foreignKeys.forEach(fk => {
      if (matrix[fk.sourceTable] && matrix[fk.sourceTable][fk.targetTable] !== undefined) {
        matrix[fk.sourceTable][fk.targetTable]++;
        matrix[fk.targetTable][fk.sourceTable]++;
        const key = `${fk.sourceTable}:${fk.targetTable}`;
        const keyR = `${fk.targetTable}:${fk.sourceTable}`;
        const detail = { from: fk.sourceTable, to: fk.targetTable, via: `${fk.sourceColumn} → ${fk.targetColumn}` };
        connectionDetails[key] = [...(connectionDetails[key] || []), detail];
        connectionDetails[keyR] = [...(connectionDetails[keyR] || []), detail];
      }
    });

    const maxVal = Math.max(1, ...Object.values(matrix).flatMap(row => Object.values(row)));
    return { matrix, maxVal, connectionDetails };
  }, [tables, schema.foreignKeys]);

  // Stats for sidebar
  const tableStats = useMemo(() => {
    return tables.map(t => {
      const connections = Object.values(matrix[t.name] || {}).reduce((a, b) => a + b, 0);
      const connectedTo = Object.values(matrix[t.name] || {}).filter(v => v > 0).length;
      return { table: t, connections, connectedTo };
    }).sort((a, b) => b.connections - a.connections);
  }, [tables, matrix]);

  const getColor = (val: number, isHovered: boolean, isSelected: boolean) => {
    if (val === 0) return isHovered ? "bg-secondary/40" : "bg-secondary/10";
    const intensity = Math.min(val / maxVal, 1);
    if (isSelected) {
      if (intensity < 0.33) return "bg-primary/40";
      if (intensity < 0.66) return "bg-primary/60";
      return "bg-primary/80";
    }
    if (isHovered) {
      if (intensity < 0.33) return "bg-primary/30";
      if (intensity < 0.66) return "bg-primary/50";
      return "bg-primary/70";
    }
    if (intensity < 0.33) return "bg-primary/15";
    if (intensity < 0.66) return "bg-primary/30";
    return "bg-primary/60";
  };

  const isHighlighted = (row: string, col: string) => {
    if (selectedTable) return row === selectedTable || col === selectedTable;
    if (hoveredCell) return row === hoveredCell.row || col === hoveredCell.col;
    return false;
  };

  // Details panel for selected pair
  const selectedDetails = selectedTable ? tableStats.find(s => s.table.name === selectedTable) : null;
  const selectedConnections = selectedTable
    ? tables.filter(t => t.name !== selectedTable && (matrix[selectedTable]?.[t.name] || 0) > 0)
    : [];

  return (
    <div className="h-full flex">
      {/* Main matrix area */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Table Correlation Matrix</h2>
              <p className="text-[10px] text-muted-foreground">Click a table name or cell to explore connections</p>
            </div>
          </div>

          <div className="inline-block">
            {/* Header row */}
            <div className="flex">
              <div className="w-[130px] shrink-0" />
              {tables.map(t => (
                <div key={t.name} className="w-9 shrink-0 flex items-end justify-center pb-1">
                  <button
                    className={`text-[8px] transform -rotate-45 origin-bottom-left whitespace-nowrap transition-colors ${
                      selectedTable === t.name ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSelectedTable(selectedTable === t.name ? null : t.name)}
                  >
                    {t.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {tables.map(row => (
              <div key={row.name} className="flex items-center">
                <button
                  className={`w-[130px] shrink-0 text-right pr-3 text-[10px] truncate transition-colors ${
                    selectedTable === row.name ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedTable(selectedTable === row.name ? null : row.name)}
                >
                  {row.name}
                </button>
                {tables.map(col => {
                  const val = matrix[row.name]?.[col.name] ?? 0;
                  const isSelf = row.name === col.name;
                  const highlighted = isHighlighted(row.name, col.name);
                  const isSelected = selectedTable === row.name || selectedTable === col.name;
                  return (
                    <Tooltip key={col.name}>
                      <TooltipTrigger asChild>
                        <button
                          className={`w-9 h-9 shrink-0 border border-background/30 flex items-center justify-center transition-all duration-150 rounded-[2px] ${
                            isSelf
                              ? "bg-foreground/5"
                              : getColor(val, highlighted, isSelected)
                          } ${val > 0 && !isSelf ? "cursor-pointer hover:scale-110 hover:z-10 hover:shadow-lg" : ""}`}
                          onMouseEnter={() => setHoveredCell({ row: row.name, col: col.name })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (!isSelf && val > 0) {
                              const t = schema.tables.find(t => t.name === col.name);
                              if (t) onTableClick(t);
                            }
                          }}
                        >
                          {val > 0 && !isSelf && (
                            <span className={`text-[10px] font-bold ${isSelected || highlighted ? "text-primary-foreground" : "text-foreground/70"}`}>
                              {val}
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[8px] text-muted-foreground/40">■</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[250px]">
                        <p className="font-semibold">{row.name} ↔ {col.name}</p>
                        <p className="text-muted-foreground">{val} relationship{val !== 1 ? "s" : ""}</p>
                        {connectionDetails[`${row.name}:${col.name}`]?.map((d, i) => (
                          <p key={i} className="text-primary/80 font-mono text-[10px] mt-0.5">{d.via}</p>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <span>Strength:</span>
              <div className="flex items-center gap-1"><div className="w-5 h-5 bg-secondary/10 border border-border/30 rounded-sm" /> None</div>
              <div className="flex items-center gap-1"><div className="w-5 h-5 bg-primary/15 border border-border/30 rounded-sm" /> Low</div>
              <div className="flex items-center gap-1"><div className="w-5 h-5 bg-primary/30 border border-border/30 rounded-sm" /> Med</div>
              <div className="flex items-center gap-1"><div className="w-5 h-5 bg-primary/60 border border-border/30 rounded-sm" /> High</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights sidebar */}
      <div className="w-64 border-l border-border/30 bg-card/30 flex flex-col min-h-0 shrink-0">
        <div className="p-4 border-b border-border/30 shrink-0">
          <h3 className="text-xs font-semibold text-foreground">
            {selectedTable ? `"${selectedTable}" Connections` : "Connection Ranking"}
          </h3>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {selectedTable ? (
            <div className="p-3 space-y-2">
              {selectedDetails && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                  <p className="text-xs font-semibold text-foreground">{selectedTable}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selectedDetails.connections} total connections · {selectedDetails.connectedTo} related tables
                  </p>
                </div>
              )}
              {selectedConnections.length === 0 && (
                <p className="text-[10px] text-muted-foreground p-2">No connections found</p>
              )}
              {selectedConnections.map(t => {
                const val = matrix[selectedTable!]?.[t.name] || 0;
                return (
                  <button
                    key={t.name}
                    className="w-full text-left p-2.5 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    onClick={() => onTableClick(t)}
                  >
                    <div className="flex items-center gap-2">
                      <Table2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{t.name}</span>
                      <span className="ml-auto text-[10px] text-primary font-bold">{val}</span>
                    </div>
                    {connectionDetails[`${selectedTable}:${t.name}`]?.map((d, i) => (
                      <p key={i} className="text-[9px] text-muted-foreground font-mono mt-1 pl-5">{d.via}</p>
                    ))}
                  </button>
                );
              })}
              <button
                className="w-full text-[10px] text-muted-foreground hover:text-foreground py-2 mt-2"
                onClick={() => setSelectedTable(null)}
              >
                ← Back to ranking
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {tableStats.map(({ table, connections, connectedTo }, i) => (
                <button
                  key={table.name}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-secondary/30 transition-colors"
                  onClick={() => setSelectedTable(table.name)}
                >
                  <span className="text-[10px] text-muted-foreground/50 w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{table.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{connections} links</span>
                      <span className="text-[9px] text-muted-foreground">· {connectedTo} tables</span>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div className="w-12 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${Math.min((connections / (tableStats[0]?.connections || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
