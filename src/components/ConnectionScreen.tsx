import { useState } from "react";
import { Database, Plus, Key, Loader2, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectConnection } from "@/lib/schema-types";

interface ConnectionScreenProps {
  hasStoredData: boolean;
  connections: ProjectConnection[];
  onUnlock: (passphrase: string) => Promise<void>;
  onSetupNew: (passphrase: string) => void;
  onAddConnection: (name: string, url: string, key: string) => Promise<void>;
  onConnect: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClearAll: () => void;
  isLoading: boolean;
  error: string | null;
}

export function ConnectionScreen({
  hasStoredData,
  connections,
  onUnlock,
  onSetupNew,
  onAddConnection,
  onConnect,
  onRemove,
  onClearAll,
  isLoading,
  error,
}: ConnectionScreenProps) {
  const [phase, setPhase] = useState<"unlock" | "setup" | "list" | "add">(
    hasStoredData ? "unlock" : connections.length > 0 ? "list" : "setup"
  );
  const [passphrase, setPassphrase] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");

  const handleUnlock = async () => {
    try {
      await onUnlock(passphrase);
      setPhase("list");
    } catch {
      // error handled by parent
    }
  };

  const handleSetup = () => {
    onSetupNew(passphrase);
    setPhase("add");
  };

  const handleAdd = async () => {
    await onAddConnection(name, url, anonKey);
    setName("");
    setUrl("");
    setAnonKey("");
    setPhase("list");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Schema Visualizer</h1>
          <p className="mt-2 text-muted-foreground">
            Connect to any Supabase project and explore its schema visually
          </p>
        </div>

        {/* Unlock Phase */}
        {phase === "unlock" && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Welcome Back
              </CardTitle>
              <CardDescription>Enter your passphrase to decrypt saved connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passphrase">Passphrase</Label>
                <Input
                  id="passphrase"
                  type="password"
                  placeholder="Enter your passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUnlock()}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={handleUnlock} disabled={!passphrase || isLoading} className="flex-1">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Unlock
                </Button>
                <Button variant="ghost" onClick={onClearAll} className="text-muted-foreground">
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Phase - first time */}
        {phase === "setup" && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Set Up Encryption
              </CardTitle>
              <CardDescription>
                Create a passphrase to encrypt your connection credentials. You'll need this every time you return.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-passphrase">Passphrase</Label>
                <Input
                  id="new-passphrase"
                  type="password"
                  placeholder="Create a secure passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetup()}
                />
              </div>
              <Button onClick={handleSetup} disabled={passphrase.length < 4} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connection List */}
        {phase === "list" && (
          <div className="space-y-4">
            {connections.length > 0 && (
              <div className="space-y-2">
                {connections.map(conn => (
                  <Card key={conn.id} className="glass border-border/50 hover-lift cursor-pointer group">
                    <CardContent className="flex items-center justify-between p-4">
                      <button
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => onConnect(conn.id)}
                        disabled={isLoading}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{conn.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[280px]">{conn.url}</p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(conn.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </div>
            )}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => setPhase("add")} variant="outline" className="flex-1">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
              <Button variant="ghost" onClick={onClearAll} className="text-muted-foreground">
                Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Add Connection */}
        {phase === "add" && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Add Supabase Project
              </CardTitle>
              <CardDescription>Enter your Supabase project URL and API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="My Project"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Project URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project-id.supabase.co"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Supabase → Settings → API → Project URL
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="anon-key">Anon (Public) Key</Label>
                <Input
                  id="anon-key"
                  type="password"
                  placeholder="eyJhbGciOiJI..."
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Supabase → Settings → API → Project API keys → anon public
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  disabled={!name || !url || !anonKey || isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Connect & Save
                </Button>
                {connections.length > 0 && (
                  <Button variant="ghost" onClick={() => setPhase("list")}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Credentials are AES-encrypted and stored in session storage only.
          <br />
          Nothing is sent to any server — everything runs in your browser.
        </p>
      </div>
    </div>
  );
}
