import { useState, useCallback } from "react";
import { ConnectionScreen } from "@/components/ConnectionScreen";
import { SchemaLayout } from "@/components/SchemaLayout";
import { useConnectionStore } from "@/stores/connection-store";
import { createSupabaseClient, fetchSchema, testConnection } from "@/lib/schema-introspection";
import type { SchemaData } from "@/lib/schema-types";

const Index = () => {
  const store = useConnectionStore();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUnlock = useCallback(async (passphrase: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      await store.loadConnections(passphrase);
    } catch (err: any) {
      store.setError(err.message || "Failed to decrypt");
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const handleSetupNew = useCallback((passphrase: string) => {
    store.setPassphrase(passphrase);
  }, [store]);

  const handleAddConnection = useCallback(async (name: string, url: string, key: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const client = createSupabaseClient(url, key);
      const ok = await testConnection(client);
      if (!ok) {
        store.setError("Could not connect. Check your URL and API key.");
        store.setLoading(false);
        return;
      }
      const conn = await store.addConnection({ name, url, anonKey: key });
      // Fetch schema
      const schema = await fetchSchema(client);
      store.setSchema(schema);
      store.setActiveConnection(conn.id);
      setShowAddForm(false);
    } catch (err: any) {
      store.setError(err.message || "Connection failed");
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const handleConnect = useCallback(async (id: string) => {
    const conn = store.connections.find(c => c.id === id);
    if (!conn) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const client = createSupabaseClient(conn.url, conn.anonKey);
      const schema = await fetchSchema(client);
      store.setSchema(schema);
      store.setActiveConnection(id);
    } catch (err: any) {
      store.setError(err.message || "Connection failed");
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const handleSwitchConnection = useCallback(async (id: string) => {
    await handleConnect(id);
  }, [handleConnect]);

  const handleDisconnect = useCallback(() => {
    store.setSchema(null);
    store.setActiveConnection(null);
  }, [store]);

  // Show schema viewer if connected
  if (store.isConnected && store.schema && store.activeConnectionId) {
    const activeConn = store.getActiveConnection();
    if (activeConn) {
      return (
        <SchemaLayout
          schema={store.schema}
          activeConnection={activeConn}
          connections={store.connections}
          onSwitchConnection={handleSwitchConnection}
          onAddConnection={() => handleDisconnect()}
          onRemoveConnection={store.removeConnection}
          onDisconnect={handleDisconnect}
        />
      );
    }
  }

  return (
    <ConnectionScreen
      hasStoredData={store.hasStoredData()}
      connections={store.connections}
      onUnlock={handleUnlock}
      onSetupNew={handleSetupNew}
      onAddConnection={handleAddConnection}
      onConnect={handleConnect}
      onRemove={store.removeConnection}
      onClearAll={store.clearAll}
      isLoading={store.isLoading}
      error={store.error}
    />
  );
};

export default Index;
