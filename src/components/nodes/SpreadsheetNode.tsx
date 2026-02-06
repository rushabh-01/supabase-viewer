import { memo, type FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2 } from "lucide-react";
import type { ColumnInfo } from "@/lib/schema-types";

interface SpreadsheetNodeData {
  label: string;
  columns: ColumnInfo[];
  columnCount: number;
  highlighted?: boolean;
}

const SpreadsheetNode: FC<NodeProps> = memo(({ data }) => {
  const { label, columns, highlighted } = data as unknown as SpreadsheetNodeData;

  return (
    <div
      className={`rounded-lg border bg-card min-w-[320px] transition-all duration-200 ${
        highlighted ? "border-primary glow" : "border-border/60"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

      <div className="px-4 py-2.5 border-b border-border/40 bg-primary/5 rounded-t-lg">
        <h3 className="font-semibold text-sm text-foreground">{label as string}</h3>
        <span className="text-[10px] text-muted-foreground">{(columns as ColumnInfo[]).length} columns</span>
      </div>

      {/* Spreadsheet Header */}
      <div className="grid grid-cols-[1fr_100px_50px_50px] text-[10px] font-semibold text-muted-foreground border-b border-border/30 px-3 py-1.5">
        <span>Column</span>
        <span>Type</span>
        <span className="text-center">Null</span>
        <span className="text-center">Key</span>
      </div>

      {/* Rows */}
      <div className="max-h-[200px] overflow-y-auto">
        {(columns as ColumnInfo[]).map((col, i) => (
          <div
            key={col.name}
            className={`grid grid-cols-[1fr_100px_50px_50px] text-xs px-3 py-1 items-center ${
              i % 2 === 0 ? "bg-secondary/10" : ""
            } hover:bg-secondary/30 transition-colors`}
          >
            <span className="font-medium text-foreground flex items-center gap-1.5">
              {col.isPrimaryKey && <Key className="h-3 w-3 text-warning" />}
              {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-3 w-3 text-info" />}
              {col.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{col.dataType}</span>
            <span className="text-center text-muted-foreground">{col.isNullable ? "✓" : "—"}</span>
            <span className="text-center">
              {col.isPrimaryKey && <span className="text-warning text-[10px] font-bold">PK</span>}
              {col.isForeignKey && !col.isPrimaryKey && <span className="text-info text-[10px] font-bold">FK</span>}
            </span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
});

SpreadsheetNode.displayName = "SpreadsheetNode";

export default SpreadsheetNode;
