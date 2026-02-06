import { useState, useEffect, useCallback } from "react";
import { Key, Link2, Table2, ExternalLink, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TableInfo, ForeignKey } from "@/lib/schema-types";

interface TableDetailDialogProps {
  table: TableInfo | null;
  foreignKeys: ForeignKey[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabaseUrl?: string;
  supabaseKey?: string;
}

const PAGE_SIZE = 25;

export function TableDetailDialog({ table, foreignKeys, open, onOpenChange, supabaseUrl, supabaseKey }: TableDetailDialogProps) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [tab, setTab] = useState<string>("data");

  const fetchData = useCallback(async (offset: number) => {
    if (!table || !supabaseUrl || !supabaseKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${table.name}?select=*&limit=${PAGE_SIZE}&offset=${offset}&order=${table.columns[0]?.name || "id"}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Range-Unit": "items",
            Range: `${offset}-${offset + PAGE_SIZE - 1}`,
            Prefer: "count=exact",
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch data: ${res.status}`);
      }

      // Parse count from Content-Range header
      const contentRange = res.headers.get("Content-Range");
      if (contentRange) {
        const match = contentRange.match(/\/(\d+|\*)/);
        if (match && match[1] !== "*") {
          setTotalCount(parseInt(match[1], 10));
        }
      }

      const data = await res.json();
      setRows(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [table, supabaseUrl, supabaseKey]);

  useEffect(() => {
    if (open && table && supabaseUrl && supabaseKey) {
      setPage(0);
      setTotalCount(null);
      setTab("data");
      fetchData(0);
    } else {
      setRows([]);
      setError(null);
    }
  }, [open, table, supabaseUrl, supabaseKey, fetchData]);

  useEffect(() => {
    if (open && table) {
      fetchData(page * PAGE_SIZE);
    }
  }, [page]);

  if (!table) return null;

  const incomingFKs = foreignKeys.filter(fk => fk.targetTable === table.name);
  const outgoingFKs = foreignKeys.filter(fk => fk.sourceTable === table.name);
  const columns = table.columns;
  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : null;
  const hasData = supabaseUrl && supabaseKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Table2 className="h-5 w-5 text-primary" />
            {table.name}
          </DialogTitle>
          <DialogDescription>
            {table.columns.length} columns · {table.schema} schema
            {totalCount !== null && ` · ${totalCount} rows`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            {hasData && <TabsTrigger value="data">Data</TabsTrigger>}
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          {/* Data tab - actual row data */}
          {hasData && (
            <TabsContent value="data" className="flex-1 flex flex-col min-h-0 mt-2">
              {isLoading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading data...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 py-8 justify-center text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {!isLoading && !error && rows.length === 0 && (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No data found in this table
                </div>
              )}

              {!isLoading && !error && rows.length > 0 && (
                <>
                  <div className="flex-1 border rounded-lg border-border/40 overflow-auto" style={{ maxHeight: "60vh" }}>
                    <table className="text-xs border-collapse" style={{ minWidth: `${columns.length * 160 + 60}px` }}>
                      <thead>
                        <tr className="border-b border-border/40 bg-secondary/30">
                          <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 left-0 z-20 bg-secondary/50 border-r border-border/20 min-w-[40px]">
                            #
                          </th>
                          {columns.map(col => (
                            <th key={col.name} className="text-left px-3 py-2 whitespace-nowrap sticky top-0 z-10 bg-secondary/50 min-w-[140px]">
                              <div className="flex items-center gap-1">
                                {col.isPrimaryKey && <Key className="h-2.5 w-2.5 text-warning" />}
                                {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-2.5 w-2.5 text-info" />}
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  {col.name}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/50 font-mono font-normal">
                                {col.dataType}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, ri) => (
                          <tr key={ri} className={`border-b border-border/10 hover:bg-secondary/20 transition-colors ${ri % 2 === 0 ? "bg-secondary/5" : ""}`}>
                            <td className="px-3 py-1.5 text-[10px] text-muted-foreground/40 font-mono sticky left-0 bg-card border-r border-border/10 min-w-[40px]">
                              {page * PAGE_SIZE + ri + 1}
                            </td>
                            {columns.map(col => {
                              const val = row[col.name];
                              return (
                                <td key={col.name} className="px-3 py-1.5 max-w-[250px] truncate font-mono text-foreground/80 min-w-[140px]">
                                  {val === null ? (
                                    <span className="text-muted-foreground/30 italic">null</span>
                                  ) : typeof val === "object" ? (
                                    <span className="text-info/60">{JSON.stringify(val).slice(0, 60)}</span>
                                  ) : typeof val === "boolean" ? (
                                    <span className={val ? "text-success" : "text-destructive"}>{String(val)}</span>
                                  ) : (
                                    String(val).slice(0, 120)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + rows.length}
                      {totalCount !== null && ` of ${totalCount}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="h-7 text-xs"
                      >
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </Button>
                      {totalPages !== null && (
                        <span className="text-xs text-muted-foreground px-2">
                          Page {page + 1} of {totalPages}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={totalPages !== null && page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="h-7 text-xs"
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {/* Schema tab */}
          <TabsContent value="schema" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-full">
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-secondary/20">
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">#</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Name</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Type</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Null</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Key</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((col, i) => (
                      <tr key={col.name} className={`border-b border-border/20 ${i % 2 === 0 ? "bg-secondary/5" : ""}`}>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground/50 font-mono">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-foreground flex items-center gap-1.5">
                          {col.isPrimaryKey && <Key className="h-3 w-3 text-warning shrink-0" />}
                          {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-3 w-3 text-info shrink-0" />}
                          {col.name}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{col.dataType}</td>
                        <td className="px-3 py-1.5 text-center text-xs">{col.isNullable ? "✓" : "—"}</td>
                        <td className="px-3 py-1.5 text-center">
                          {col.isPrimaryKey && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning">PK</span>}
                          {col.isForeignKey && !col.isPrimaryKey && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/20 text-info">FK</span>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {col.defaultValue || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Relationships tab */}
          <TabsContent value="relationships" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-full">
              {outgoingFKs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    References (outgoing)
                  </h4>
                  <div className="space-y-1.5">
                    {outgoingFKs.map(fk => (
                      <div key={fk.constraintName} className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/10 text-xs">
                        <span className="text-info font-medium">{fk.sourceColumn}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">{fk.targetTable}.{fk.targetColumn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incomingFKs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Referenced by (incoming)
                  </h4>
                  <div className="space-y-1.5">
                    {incomingFKs.map(fk => (
                      <div key={fk.constraintName} className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/10 text-xs">
                        <span className="text-foreground">{fk.sourceTable}.{fk.sourceColumn}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-warning font-medium">{fk.targetColumn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoingFKs.length === 0 && incomingFKs.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No relationships found for this table
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
