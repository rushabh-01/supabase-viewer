import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SchemaData, TableInfo, ColumnInfo, ForeignKey } from "./schema-types";

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

export async function testConnection(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client.from("_dummy_test_").select("*").limit(0);
    // A 404 / PGRST error is fine — it means connection works, table just doesn't exist
    if (error && !error.message.includes("does not exist") && !error.code?.startsWith("PGRST")) {
      // Last resort — just check if we can reach the API
      const url = (client as any).supabaseUrl || "";
      const key = (client as any).supabaseKey || "";
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key },
      });
      return res.ok;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch schema using Supabase's OpenAPI spec endpoint.
 * Every Supabase project exposes GET /rest/v1/ which returns an OpenAPI JSON
 * document describing all public tables, columns, types, and relationships.
 */
export async function fetchSchema(client: SupabaseClient): Promise<SchemaData> {
  const url = (client as any).supabaseUrl || "";
  const key = (client as any).supabaseKey || "";

  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
  }

  const spec = await res.json();
  return parseOpenApiSpec(spec);
}

function parseOpenApiSpec(spec: any): SchemaData {
  const definitions = spec.definitions || {};
  const paths = spec.paths || {};
  const tables: TableInfo[] = [];
  const foreignKeys: ForeignKey[] = [];
  const fkSet = new Set<string>();

  // Parse each definition as a table
  for (const [tableName, def] of Object.entries<any>(definitions)) {
    // Skip internal/meta tables
    if (tableName.startsWith("_")) continue;

    const properties = def.properties || {};
    const requiredFields = new Set(def.required || []);
    const columns: ColumnInfo[] = [];

    for (const [colName, colDef] of Object.entries<any>(properties)) {
      const isPk = colDef.description?.includes("<pk") || false;
      const fkMatch = colDef.description?.match(/<fk\s+table='([^']+)'\s+column='([^']+)'/);
      const isFk = !!fkMatch;

      if (isFk) {
        const fk: ForeignKey = {
          constraintName: `${tableName}_${colName}_fkey`,
          sourceTable: tableName,
          sourceColumn: colName,
          targetTable: fkMatch[1],
          targetColumn: fkMatch[2],
        };
        const fkKey = `${fk.sourceTable}.${fk.sourceColumn}->${fk.targetTable}.${fk.targetColumn}`;
        if (!fkSet.has(fkKey)) {
          fkSet.add(fkKey);
          foreignKeys.push(fk);
        }
      }

      // Parse type
      let dataType = colDef.type || "unknown";
      if (colDef.format) {
        dataType = colDef.format;
      }
      // Handle arrays
      if (dataType === "array" && colDef.items) {
        dataType = `${colDef.items.type || colDef.items.format || "unknown"}[]`;
      }

      columns.push({
        name: colName,
        dataType,
        isNullable: !requiredFields.has(colName),
        defaultValue: colDef.default ?? null,
        isPrimaryKey: isPk,
        isForeignKey: isFk,
        isUnique: false,
        references: isFk ? { table: fkMatch[1], column: fkMatch[2] } : undefined,
      });
    }

    // Sort: PKs first, then FKs, then rest alphabetically
    columns.sort((a, b) => {
      if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
      if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
      if (a.isForeignKey && !b.isForeignKey) return -1;
      if (!a.isForeignKey && b.isForeignKey) return 1;
      return a.name.localeCompare(b.name);
    });

    tables.push({
      name: tableName,
      schema: "public",
      columns,
    });
  }

  // Sort tables alphabetically
  tables.sort((a, b) => a.name.localeCompare(b.name));

  return { tables, foreignKeys, enums: [] };
}
