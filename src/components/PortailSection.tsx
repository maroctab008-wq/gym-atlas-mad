import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface TerminalConfig {
  name: string;
  ip: string;
  port: string;
  username: string;
  password: string;
}

interface GateData {
  terminals: TerminalConfig[];
  strict_payment_enforcement: boolean;
}

interface TerminalStatus {
  status: "unknown" | "connected" | "disconnected";
  testing: boolean;
}

interface SyncMember {
  id: string;
  full_name: string;
  payment_status: string;
  access_status: "authorized" | "blocked";
  balance_due: number;
  subscription_status: string;
}

const DEFAULT_TERMINALS: TerminalConfig[] = [
  { name: "Terminal 1", ip: "192.168.31.27", port: "80", username: "admin", password: "" },
  { name: "Terminal 2", ip: "", port: "80", username: "admin", password: "" },
  { name: "Terminal 3", ip: "", port: "80", username: "admin", password: "" },
];

export default function PortailSection() {
  const { toast } = useToast();
  const [gate, setGate] = useState<GateData>({
    terminals: DEFAULT_TERMINALS,
    strict_payment_enforcement: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [terminalStatuses, setTerminalStatuses] = useState<TerminalStatus[]>(
    DEFAULT_TERMINALS.map(() => ({ status: "unknown", testing: false }))
  );
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTarget, setSyncTarget] = useState<string>("all");
  const [members, setMembers] = useState<SyncMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [daysTolerance, setDaysTolerance] = useState(3);
  const [syncResults, setSyncResults] = useState<
    { name: string; success: boolean; error?: string }[] | null
  >(null);

  const migrateGateData = (raw: Record<string, any>): GateData => {
    if (raw.terminals && Array.isArray(raw.terminals)) {
      const terminals = [...raw.terminals];
      while (terminals.length < 3) {
        terminals.push({ name: `Terminal ${terminals.length + 1}`, ip: "", port: "80", username: "admin", password: "" });
      }
      return { terminals, strict_payment_enforcement: raw.strict_payment_enforcement ?? true };
    }
    return {
      terminals: [
        { name: "Terminal 1", ip: raw.controller_ip || "192.168.31.27", port: raw.controller_port || "80", username: raw.username || "admin", password: raw.password || raw.api_key || "" },
        { name: "Terminal 2", ip: "", port: "80", username: "admin", password: "" },
        { name: "Terminal 3", ip: "", port: "80", username: "admin", password: "" },
      ],
      strict_payment_enforcement: raw.strict_payment_enforcement ?? true,
    };
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/settings");
      if (data) {
        for (const row of data) {
          const v = row.value as Record<string, any>;
          if (row.key === "gate_control") {
            const migrated = migrateGateData(v);
            setGate(migrated);
            setTerminalStatuses(migrated.terminals.map(() => ({ status: "unknown", testing: false })));
          }
          if (row.key === "access_rules") setDaysTolerance(v.days_tolerance ?? 3);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const { data } = await api.get("/terminal/sync-members");
      if (data) setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) loadMembers();
  }, [loading, loadMembers]);

  const testConnection = async (index: number) => {
    const terminal = gate.terminals[index];
    if (!terminal.ip) {
      toast({ title: "IP non configurée", description: `Veuillez configurer l'IP de ${terminal.name}`, variant: "destructive" });
      return;
    }

    setTerminalStatuses((prev) => prev.map((s, i) => i === index ? { ...s, testing: true } : s));

    try {
      const { data, error } = await api.post("/terminal/test-connection", {
        ip: terminal.ip, port: terminal.port || "80", username: terminal.username, password: terminal.password,
      });

      if (error || !data?.success) {
        setTerminalStatuses((prev) => prev.map((s, i) => i === index ? { status: "disconnected", testing: false } : s));
        toast({ title: `${terminal.name} — Erreur`, description: data?.error || "Vérifiez l'IP ou le réseau", variant: "destructive" });
      } else {
        setTerminalStatuses((prev) => prev.map((s, i) => i === index ? { status: "connected", testing: false } : s));
        toast({ title: `✅ ${terminal.name} — Connexion réussie` });
      }
    } catch {
      setTerminalStatuses((prev) => prev.map((s, i) => i === index ? { status: "disconnected", testing: false } : s));
      toast({ title: `${terminal.name} — Erreur`, description: "Impossible de joindre le terminal", variant: "destructive" });
    }
  };

  const testAllConnections = async () => {
    const configured = gate.terminals.filter((t) => t.ip);
    if (configured.length === 0) {
      toast({ title: "Aucun terminal configuré", variant: "destructive" });
      return;
    }
    await Promise.all(gate.terminals.map((t, i) => (t.ip ? testConnection(i) : Promise.resolve())));
  };

  const syncMembers = async () => {
    setSyncing(true);
    setSyncProgress(10);
    setSyncResults(null);

    const targetTerminals =
      syncTarget === "all"
        ? gate.terminals.filter((t) => t.ip)
        : gate.terminals.filter((t, i) => String(i) === syncTarget && t.ip);

    if (targetTerminals.length === 0) {
      toast({ title: "Aucun terminal cible configuré", variant: "destructive" });
      setSyncing(false);
      setSyncProgress(0);
      return;
    }

    try {
      setSyncProgress(30);

      const { data, error } = await api.post("/terminal/sync", {
        members, terminals: targetTerminals,
      });

      setSyncProgress(80);

      if (error) {
        toast({ title: "Erreur de synchronisation", description: "Impossible de synchroniser", variant: "destructive" });
        return;
      }

      setSyncProgress(100);

      if (data?.terminal_results) {
        setSyncResults(data.terminal_results);
      }

      if (data?.success) {
        toast({ title: "Synchronisation terminée", description: data.message });
      } else {
        toast({ title: "Erreur", description: data?.error || "Erreur inconnue", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de communication avec le serveur", variant: "destructive" });
    } finally {
      setTimeout(() => { setSyncing(false); setSyncProgress(0); }, 1000);
    }
  };

  const saveGateConfig = async () => {
    setSaving("gate_control");
    const { error } = await api.put("/settings/gate_control", { value: gate });
    setSaving("");
    if (error) toast({ title: "Erreur", description: error, variant: "destructive" });
    else toast({ title: "Configuration enregistrée" });
  };

  const updateTerminal = (index: number, field: keyof TerminalConfig, value: string) => {
    setGate((prev) => ({
      ...prev,
      terminals: prev.terminals.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  const addTerminal = () => {
    setGate((prev) => ({
      ...prev,
      terminals: [...prev.terminals, { name: `Terminal ${prev.terminals.length + 1}`, ip: "", port: "80", username: "admin", password: "" }],
    }));
    setTerminalStatuses((prev) => [...prev, { status: "unknown", testing: false }]);
  };

  const removeTerminal = (index: number) => {
    if (gate.terminals.length <= 1) return;
    setGate((prev) => ({ ...prev, terminals: prev.terminals.filter((_, i) => i !== index) }));
    setTerminalStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const configuredTerminals = gate.terminals.filter((t) => t.ip);
  const authorizedCount = members.filter((m) => m.access_status === "authorized").length;
  const blockedCount = members.filter((m) => m.access_status === "blocked").length;

  const statusDot = (s: TerminalStatus["status"]) =>
    s === "connected" ? "bg-success" : s === "disconnected" ? "bg-destructive" : "bg-muted-foreground";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Contrôle Portail — Hikvision DS-K1T321MFWX (ISAPI)
          </h2>
          <div className="flex gap-1">
            {gate.terminals.map((t, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${t.ip ? statusDot(terminalStatuses[i]?.status || "unknown") : "bg-muted"}`}
                title={`${t.name}: ${t.ip || "Non configuré"}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={testAllConnections} disabled={configuredTerminals.length === 0} className="gap-2">
            <Wifi className="w-4 h-4" />
            Tester tous
          </Button>
          <div className="flex gap-2 items-center">
            <Select value={syncTarget} onValueChange={setSyncTarget}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les terminaux</SelectItem>
                {gate.terminals.map((t, i) => (
                  <SelectItem key={i} value={String(i)} disabled={!t.ip}>
                    {t.name}{!t.ip && " (non configuré)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={syncMembers} disabled={syncing || members.length === 0} className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Synchroniser
            </Button>
          </div>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Synchronisation en cours...</span>
            <span>{syncProgress}%</span>
          </div>
          <Progress value={syncProgress} className="h-2" />
        </div>
      )}

      {/* Sync results per terminal */}
      {syncResults && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {syncResults.map((r: any, i: number) => (
            <Card key={i} className={`shadow-sm border-l-4 ${r.success ? "border-l-success" : "border-l-destructive"}`}>
              <CardContent className="p-3 flex items-center gap-3">
                {r.success ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.success ? "Synchronisé" : r.error}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Shield className="w-5 h-5 text-muted-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total membres</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold text-success">{authorizedCount}</p>
              <p className="text-xs text-muted-foreground">Autorisés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="w-5 h-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-destructive">{blockedCount}</p>
              <p className="text-xs text-muted-foreground">Bloqués</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Membres à synchroniser</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadMembers} disabled={loadingMembers} className="gap-1">
              {loadingMembers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut Paiement</TableHead>
                  <TableHead className="text-center">État d'accès</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun membre trouvé</TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-xs">{member.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>
                        <span className={member.payment_status === "Soldé" ? "text-success" : member.payment_status === "Aucun abonnement" ? "text-muted-foreground" : "text-warning"}>
                          {member.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={member.access_status === "authorized" ? "default" : "destructive"} className={member.access_status === "authorized" ? "bg-success hover:bg-success/80" : ""}>
                          {member.access_status === "authorized" ? "Autorisé" : "Bloqué"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Configuration */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Configuration des Terminaux — DS-K1T321MFWX (ISAPI)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addTerminal} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {gate.terminals.map((terminal, index) => (
            <div key={index} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${terminal.ip ? statusDot(terminalStatuses[index]?.status || "unknown") : "bg-muted"}`} />
                  <Input
                    value={terminal.name}
                    onChange={(e) => updateTerminal(index, "name", e.target.value)}
                    className="font-semibold border-none p-0 h-auto text-sm bg-transparent w-40"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => testConnection(index)} disabled={!terminal.ip || terminalStatuses[index]?.testing} className="gap-1">
                    {terminalStatuses[index]?.testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : terminalStatuses[index]?.status === "connected" ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    Tester
                  </Button>
                  {gate.terminals.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeTerminal(index)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Adresse IP</Label>
                  <Input value={terminal.ip} onChange={(e) => updateTerminal(index, "ip", e.target.value)} className="mt-1 font-mono text-sm" placeholder="192.168.31.27" />
                </div>
                <div>
                  <Label className="text-xs">Port ISAPI</Label>
                  <Input value={terminal.port} onChange={(e) => updateTerminal(index, "port", e.target.value)} className="mt-1 font-mono text-sm" placeholder="80" />
                  <p className="text-xs text-muted-foreground mt-0.5">80 ou 8000</p>
                </div>
                <div>
                  <Label className="text-xs">Nom d'utilisateur</Label>
                  <Input value={terminal.username} onChange={(e) => updateTerminal(index, "username", e.target.value)} className="mt-1 text-sm" placeholder="admin" />
                </div>
                <div>
                  <Label className="text-xs">Mot de passe</Label>
                  <Input type="password" value={terminal.password} onChange={(e) => updateTerminal(index, "password", e.target.value)} className="mt-1 font-mono text-sm" placeholder="••••••••" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="text-sm">Application stricte du paiement</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Refuser l'accès si le solde &gt; 0 MAD</p>
            </div>
            <Switch checked={gate.strict_payment_enforcement} onCheckedChange={(v) => setGate({ ...gate, strict_payment_enforcement: v })} />
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2 bg-secondary/30">
            <p className="text-sm font-medium">Logique d'accès automatisée</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                <strong className="text-foreground">Accès accordé:</strong> Abonnement actif + Reste à payer = 0
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                <strong className="text-foreground">Tolérance:</strong> Expiré &lt; {daysTolerance}j OU Reste à payer &gt; 0
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <strong className="text-foreground">Accès refusé:</strong> Expiré &gt; {daysTolerance}j OU En attente sans paiement
              </p>
            </div>
          </div>

          <Button onClick={saveGateConfig} disabled={saving === "gate_control"} className="gap-2">
            {saving === "gate_control" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer la configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
