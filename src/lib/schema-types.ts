export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCount?: number;
}

export interface ForeignKey {
  constraintName: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface SchemaData {
  tables: TableInfo[];
  foreignKeys: ForeignKey[];
  enums: { name: string; values: string[] }[];
}

export interface ProjectConnection {
  id: string;
  name: string;
  url: string;
  anonKey: string;
  createdAt: number;
}

export type ViewMode =
  | "er-diagram"
  | "uml"
  | "hierarchy"
  | "spreadsheet"
  | "relationship-drill"
  | "process-flow"
  | "node-link"
  | "timeline"
  | "layer"
  | "swimlane"
  | "story-driven"
  | "data-correlation"
  | "grouped"
  | "schema-explorer";

export interface ViewConfig {
  id: ViewMode;
  label: string;
  icon: string;
  description: string;
}

export const VIEW_CONFIGS: ViewConfig[] = [
  { id: "er-diagram", label: "ER Diagram", icon: "GitBranch", description: "Entity-Relationship diagram with attributes and relationship lines" },
  { id: "uml", label: "UML Class", icon: "Box", description: "Tables as UML classes with typed attributes" },
  { id: "hierarchy", label: "Hierarchy", icon: "Network", description: "Tree layout showing parent-child relationships" },
  { id: "spreadsheet", label: "Spreadsheet", icon: "Table", description: "Tables shown as mini spreadsheets with column details" },
  { id: "relationship-drill", label: "Drill View", icon: "Focus", description: "Select a table and explore all its relationships" },
  { id: "process-flow", label: "Process Flow", icon: "Workflow", description: "Directional data flow showing how information moves between tables" },
  { id: "node-link", label: "Node-Link", icon: "Share2", description: "Radial network graph showing table connectivity" },
  { id: "timeline", label: "Timeline", icon: "Clock", description: "Tables ordered by dependency chain" },
  { id: "layer", label: "Layer View", icon: "Layers", description: "Tables grouped into functional layers" },
  { id: "swimlane", label: "Swimlane", icon: "Columns3", description: "Tables organized into lanes by domain" },
  { id: "story-driven", label: "Story View", icon: "BookOpen", description: "Guided walkthrough of data relationships" },
  { id: "data-correlation", label: "Correlation", icon: "Grid3X3", description: "Heatmap showing connection strength between tables" },
  { id: "grouped", label: "Grouped", icon: "Group", description: "Auto-clustered related tables with expandable groups" },
  { id: "schema-explorer", label: "Explorer", icon: "Search", description: "Click-to-expand tree with search and filters" },
];
