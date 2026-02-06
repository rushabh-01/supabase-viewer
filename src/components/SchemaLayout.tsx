import { useState, useRef, useCallback } from "react";
import {
  Search,
  Download,
  Maximize,
  Database,
  ChevronLeft,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SchemaFlow, FLOW_VIEWS } from "@/components/SchemaFlow";
import { SpreadsheetView } from "@/components/views/SpreadsheetView";
import { CorrelationView } from "@/components/views/CorrelationView";
import { ExplorerView } from "@/components/views/ExplorerView";
import { GroupedView } from "@/components/views/GroupedView";
import { StoryView } from "@/components/views/StoryView";
import { LayerView } from "@/components/views/LayerView";
import { TimelineView } from "@/components/views/TimelineView";
import { HierarchyView } from "@/components/views/HierarchyView";
import { SwimlaneView } from "@/components/views/SwimlaneView";
import { NodeLinkView } from "@/components/views/NodeLinkView";
import { ProcessFlowView } from "@/components/views/ProcessFlowView";
import { TableDetailDialog } from "@/components/TableDetailDialog";
import { VIEW_CONFIGS, type ViewMode, type SchemaData, type ProjectConnection, type TableInfo } from "@/lib/schema-types";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";

interface SchemaLayoutProps {
  schema: SchemaData;
  activeConnection: ProjectConnection;
  connections: ProjectConnection[];
  onSwitchConnection: (id: string) => void;
  onAddConnection: () => void;
  onRemoveConnection: (id: string) => void;
  onDisconnect: () => void;
}

// Non-flow views that render their own UI
const NON_FLOW_VIEWS: ViewMode[] = [
  "spreadsheet", "data-correlation", "schema-explorer",
  "grouped", "story-driven", "layer", "timeline",
  "hierarchy", "swimlane", "node-link", "process-flow",
];

export function SchemaLayout({
  schema,
  activeConnection,
  connections,
  onSwitchConnection,
  onAddConnection,
  onRemoveConnection,
  onDisconnect,
}: SchemaLayoutProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("er-diagram");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const handleTableClick = useCallback((table: TableInfo) => {
    setSelectedTable(table);
    setDetailOpen(true);
  }, []);

  const isFlowView = FLOW_VIEWS.includes(viewMode);

  const handleExport = async (format: "png" | "svg" | "pdf" | "json") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
      downloadBlob(blob, `schema-${activeConnection.name}.json`);
      return;
    }

    if (!flowRef.current) return;

    // For flow views, target the react-flow viewport; for others, target the container
    const el = isFlowView
      ? (flowRef.current.querySelector(".react-flow") as HTMLElement)
      : flowRef.current;
    if (!el) return;

    const pixelRatio = format === "png" ? 3 : 2; // High-res for PNG

    try {
      if (format === "png") {
        const url = await toPng(el, {
          backgroundColor: "hsl(228, 12%, 8%)",
          pixelRatio,
          cacheBust: true,
        });
        downloadUrl(url, `schema-${viewMode}.png`);
      } else if (format === "svg") {
        const url = await toSvg(el, {
          backgroundColor: "hsl(228, 12%, 8%)",
          cacheBust: true,
        });
        downloadUrl(url, `schema-${viewMode}.svg`);
      } else if (format === "pdf") {
        const url = await toPng(el, {
          backgroundColor: "hsl(228, 12%, 8%)",
          pixelRatio: 3,
          cacheBust: true,
        });
        const img = new Image();
        img.src = url;
        await new Promise(r => { img.onload = r; });
        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(url, "PNG", 0, 0, img.width, img.height);
        pdf.save(`schema-${viewMode}.pdf`);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const downloadUrl = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrl(url, filename);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      flowRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderView = () => {
    switch (viewMode) {
      case "spreadsheet":
        return <SpreadsheetView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "data-correlation":
        return <CorrelationView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "schema-explorer":
        return <ExplorerView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "grouped":
        return <GroupedView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "story-driven":
        return <StoryView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "layer":
        return <LayerView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "timeline":
        return <TimelineView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "hierarchy":
        return <HierarchyView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "swimlane":
        return <SwimlaneView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "node-link":
        return <NodeLinkView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      case "process-flow":
        return <ProcessFlowView schema={schema} searchQuery={searchQuery} onTableClick={handleTableClick} />;
      default:
        return <SchemaFlow schema={schema} viewMode={viewMode} searchQuery={searchQuery} onTableClick={handleTableClick} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-border/50 bg-sidebar flex flex-col min-h-0 animate-slide-in">
          {/* Project Selector */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{activeConnection.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{schema.tables.length} tables</p>
              </div>
            </div>

            {connections.filter(c => c.id !== activeConnection.id).map(conn => (
              <button
                key={conn.id}
                onClick={() => onSwitchConnection(conn.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors group"
              >
                <Database className="h-3 w-3" />
                <span className="truncate flex-1 text-left">{conn.name}</span>
                <Trash2
                  className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.id); }}
                />
              </button>
            ))}

            <div className="flex gap-1 mt-2">
              <Button variant="ghost" size="sm" onClick={onAddConnection} className="flex-1 text-xs h-7">
                <Plus className="h-3 w-3" /> Add
              </Button>
              <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-xs h-7 text-muted-foreground">
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* View Switcher */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Views</p>
              {VIEW_CONFIGS.map((view) => {
                const Icon = (LucideIcons as any)[view.icon] || Database;
                return (
                  <Tooltip key={view.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode(view.id)}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-all ${
                          viewMode === view.id
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{view.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                      {view.description}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/50">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8">
            <ChevronLeft className={`h-4 w-4 transition-transform ${!sidebarOpen ? "rotate-180" : ""}`} />
          </Button>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables or columns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-secondary/30 border-border/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            {(["png", "svg", "pdf", "json"] as const).map(fmt => (
              <Tooltip key={fmt}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => handleExport(fmt)} className="h-8 text-xs">
                    <Download className="h-3 w-3" />
                    {fmt.toUpperCase()}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as {fmt.toUpperCase()}</TooltipContent>
              </Tooltip>
            ))}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Content */}
        <div ref={flowRef} className="flex-1">
          {renderView()}
        </div>
      </div>

      {/* Table Detail Dialog */}
      <TableDetailDialog
        table={selectedTable}
        foreignKeys={schema.foreignKeys}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        supabaseUrl={activeConnection.url}
        supabaseKey={activeConnection.anonKey}
      />
    </div>
  );
}
