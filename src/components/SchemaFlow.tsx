import { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ERTableNode from "@/components/nodes/ERTableNode";
import UMLClassNode from "@/components/nodes/UMLClassNode";
import DrillNode from "@/components/nodes/DrillNode";
import { getLayoutedElements } from "@/lib/layout-utils";
import type { SchemaData, ViewMode, TableInfo } from "@/lib/schema-types";

// Views that use React Flow
export const FLOW_VIEWS: ViewMode[] = [
  "er-diagram", "uml", "relationship-drill",
];

interface SchemaFlowProps {
  schema: SchemaData;
  viewMode: ViewMode;
  searchQuery: string;
  onTableClick?: (table: TableInfo) => void;
}

export function SchemaFlow({ schema, viewMode, searchQuery, onTableClick }: SchemaFlowProps) {
  const [highlightedTable, setHighlightedTable] = useState<string | null>(null);
  const [selectedDrillTable, setSelectedDrillTable] = useState<string | null>(null);

  const nodeTypes = useMemo<NodeTypes>(() => {
    if (viewMode === "uml") return { tableNode: UMLClassNode };
    if (viewMode === "relationship-drill") return { tableNode: DrillNode };
    return { tableNode: ERTableNode };
  }, [viewMode]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const tables = schema.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    let filteredTables = tables;
    let filteredFKs = schema.foreignKeys;

    // Drill view filtering
    if (viewMode === "relationship-drill" && selectedDrillTable) {
      const related = new Set<string>();
      related.add(selectedDrillTable);
      schema.foreignKeys.forEach(fk => {
        if (fk.sourceTable === selectedDrillTable) related.add(fk.targetTable);
        if (fk.targetTable === selectedDrillTable) related.add(fk.sourceTable);
      });
      const direct = [...related];
      direct.forEach(t => {
        schema.foreignKeys.forEach(fk => {
          if (fk.sourceTable === t) related.add(fk.targetTable);
          if (fk.targetTable === t) related.add(fk.sourceTable);
        });
      });
      filteredTables = schema.tables.filter(t => related.has(t.name));
      filteredFKs = schema.foreignKeys.filter(fk => related.has(fk.sourceTable) && related.has(fk.targetTable));
    }

    const nodes: Node[] = filteredTables.map((table) => ({
      id: table.name,
      type: "tableNode",
      position: { x: 0, y: 0 },
      data: {
        label: table.name,
        columns: table.columns,
        columnCount: table.columns.length,
        highlighted: highlightedTable === table.name,
        isCenter: viewMode === "relationship-drill" && selectedDrillTable === table.name,
      },
    }));

    const edges: Edge[] = filteredFKs.map((fk) => ({
      id: fk.constraintName,
      source: fk.sourceTable,
      target: fk.targetTable,
      sourceHandle: null,
      targetHandle: null,
      type: "smoothstep",
      animated: highlightedTable === fk.sourceTable || highlightedTable === fk.targetTable,
      style: {
        stroke:
          highlightedTable === fk.sourceTable || highlightedTable === fk.targetTable
            ? "hsl(250, 80%, 68%)"
            : "hsl(228, 10%, 30%)",
        strokeWidth: highlightedTable === fk.sourceTable || highlightedTable === fk.targetTable ? 2 : 1,
      },
      label: `${fk.sourceColumn} → ${fk.targetColumn}`,
      labelStyle: { fill: "hsl(220, 10%, 52%)", fontSize: 10 },
      labelBgStyle: { fill: "hsl(228, 12%, 11%)", fillOpacity: 0.9 },
    }));

    return getLayoutedElements(nodes, edges, "LR");
  }, [schema, viewMode, searchQuery, highlightedTable, selectedDrillTable]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeMouseEnter = useCallback((_: any, node: Node) => {
    setHighlightedTable(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHighlightedTable(null);
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (viewMode === "relationship-drill") {
      setSelectedDrillTable(node.id);
    }
    if (onTableClick) {
      const table = schema.tables.find(t => t.name === node.id);
      if (table) onTableClick(table);
    }
  }, [viewMode, onTableClick, schema.tables]);

  return (
    <div className="w-full h-full relative">
      {viewMode === "relationship-drill" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass rounded-lg px-4 py-2 text-xs text-muted-foreground">
          {selectedDrillTable
            ? `Showing relationships for "${selectedDrillTable}" — click another table to drill`
            : "Click any table to explore its relationships"}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(228, 10%, 15%)" />
        <Controls />
        <MiniMap
          nodeColor={() => "hsl(250, 80%, 68%)"}
          maskColor="hsl(228, 12%, 8%, 0.8)"
          style={{ borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  );
}
