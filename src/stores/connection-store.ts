import { useState, useCallback } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import type { ProjectConnection, SchemaData } from "@/lib/schema-types";

const STORAGE_KEY = "schema-viz-connections";

interface ConnectionState {
  connections: ProjectConnection[];
  activeConnectionId: string | null;
  schema: SchemaData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  passphrase: string | null;
}

export function useConnectionStore() {
  const [state, setState] = useState<ConnectionState>({
    connections: [],
    activeConnectionId: null,
    schema: null,
    isConnected: false,
    isLoading: false,
    error: null,
    passphrase: null,
  });

  const hasStoredData = useCallback((): boolean => {
    return !!sessionStorage.getItem(STORAGE_KEY);
  }, []);

  const loadConnections = useCallback(async (passphrase: string): Promise<ProjectConnection[]> => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const decrypted = await decrypt(stored, passphrase);
      const connections = JSON.parse(decrypted) as ProjectConnection[];
      setState(s => ({ ...s, connections, passphrase }));
      return connections;
    } catch {
      throw new Error("Invalid passphrase");
    }
  }, []);

  const saveConnections = useCallback(async (connections: ProjectConnection[], passphrase: string) => {
    const encrypted = await encrypt(JSON.stringify(connections), passphrase);
    sessionStorage.setItem(STORAGE_KEY, encrypted);
  }, []);

  const addConnection = useCallback(async (conn: Omit<ProjectConnection, "id" | "createdAt">) => {
    if (!state.passphrase) throw new Error("No passphrase set");
    const newConn: ProjectConnection = {
      ...conn,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const updated = [...state.connections, newConn];
    await saveConnections(updated, state.passphrase);
    setState(s => ({ ...s, connections: updated }));
    return newConn;
  }, [state.connections, state.passphrase, saveConnections]);

  const removeConnection = useCallback(async (id: string) => {
    if (!state.passphrase) return;
    const updated = state.connections.filter(c => c.id !== id);
    await saveConnections(updated, state.passphrase);
    setState(s => ({
      ...s,
      connections: updated,
      activeConnectionId: s.activeConnectionId === id ? null : s.activeConnectionId,
      isConnected: s.activeConnectionId === id ? false : s.isConnected,
      schema: s.activeConnectionId === id ? null : s.schema,
    }));
  }, [state.connections, state.passphrase, saveConnections]);

  const setActiveConnection = useCallback((id: string | null) => {
    setState(s => ({ ...s, activeConnectionId: id }));
  }, []);

  const setSchema = useCallback((schema: SchemaData | null) => {
    setState(s => ({ ...s, schema, isConnected: !!schema }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(s => ({ ...s, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(s => ({ ...s, error }));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    setState(s => ({ ...s, passphrase }));
  }, []);

  const clearAll = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      connections: [],
      activeConnectionId: null,
      schema: null,
      isConnected: false,
      isLoading: false,
      error: null,
      passphrase: null,
    });
  }, []);

  const getActiveConnection = useCallback((): ProjectConnection | null => {
    return state.connections.find(c => c.id === state.activeConnectionId) ?? null;
  }, [state.connections, state.activeConnectionId]);

  return {
    ...state,
    hasStoredData,
    loadConnections,
    addConnection,
    removeConnection,
    setActiveConnection,
    setSchema,
    setLoading,
    setError,
    setPassphrase,
    clearAll,
    getActiveConnection,
  };
}
