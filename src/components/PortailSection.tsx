import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface GateData {
  controller_ip: string;
  controller_port: string;
  api_key: string;
  strict_payment_enforcement: boolean;
}

interface SyncMember {
  id: string;
  full_name: string;
  payment_status: string;
  access_status: "authorized" | "blocked";
  balance_due: number;
  subscription_status: string;
}

export default function PortailSection() {
  const { toast } = useToast();
  const [gate, setGate] = useState<GateData>({
    controller_ip: "",
    controller_port: "80",
    api_key: "",
    strict_payment_enforcement: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [members, setMembers] = useState<SyncMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [daysTolerance, setDaysTolerance] = useState(3);

  // Load settings and members
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (data) {
        for (const row of data) {
          const v = row.value as Record<string, any>;
          if (row.key === "gate_control") setGate(v as GateData);
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
      // Fetch members with their latest subscription info
      const { data: membersData } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");

      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("member_id, status, amount_mad, paid_mad, end_date")
        .in("status", ["active", "pending", "expired"]);

      if (!membersData) {
        setMembers([]);
        return;
      }

      const now = new Date();
      const syncMembers: SyncMember[] = membersData.map((m) => {
        // Find active or most recent subscription
        const memberSubs = (subscriptions || [])
          .filter((s) => s.member_id === m.id)
          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

        const activeSub = memberSubs.find((s) => s.status === "active") || memberSubs[0];

        if (!activeSub) {
          return {
            id: m.id,
            full_name: m.full_name,
            payment_status: "Aucun abonnement",
            access_status: "blocked" as const,
            balance_due: 0,
            subscription_status: "none",
          };
        }

        const balanceDue = activeSub.amount_mad - activeSub.paid_mad;
        const isActive = activeSub.status === "active";
        const isPaid = balanceDue <= 0;

        // Authorized: Active subscription AND balance = 0
        const isAuthorized = isActive && isPaid;

        let paymentStatus = "";
        if (isPaid) paymentStatus = "Soldé";
        else paymentStatus = `Reste: ${balanceDue} MAD`;

        return {
          id: m.id,
          full_name: m.full_name,
          payment_status: paymentStatus,
          access_status: isAuthorized ? ("authorized" as const) : ("blocked" as const),
          balance_due: balanceDue,
          subscription_status: activeSub.status,
        };
      });

      setMembers(syncMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) loadMembers();
  }, [loading, loadMembers]);

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("terminal-test-connection");

      if (error) {
        setConnectionStatus("disconnected");
        toast({
          title: "Erreur de connexion",
          description: "Vérifiez l'IP ou le réseau du terminal",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        setConnectionStatus("connected");
        toast({ title: "✅ Connexion au terminal réussie" });
      } else {
        setConnectionStatus("disconnected");
        toast({
          title: "Erreur de connexion",
          description: data?.error || "Vérifiez l'IP ou le réseau du terminal",
          variant: "destructive",
        });
      }
    } catch {
      setConnectionStatus("disconnected");
      toast({
        title: "Erreur de connexion",
        description: "Impossible de joindre le terminal",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const syncMembers = async () => {
    setSyncing(true);
    setSyncProgress(10);

    try {
      setSyncProgress(30);

      const { data, error } = await supabase.functions.invoke("terminal-sync", {
        body: { members },
      });

      setSyncProgress(80);

      if (error) {
        toast({
          title: "Erreur de synchronisation",
          description: "Impossible de synchroniser avec le terminal",
          variant: "destructive",
        });
        return;
      }

      setSyncProgress(100);

      if (data?.success) {
        toast({
          title: "Synchronisation réussie",
          description: data.message,
        });
      } else {
        toast({
          title: "Erreur",
          description: data?.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur de communication avec le serveur",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
      }, 1000);
    }
  };

  const saveGateConfig = async () => {
    setSaving("gate_control");
    const { error } = await supabase
      .from("app_settings")
      .update({ value: gate as any })
      .eq("key", "gate_control");
    setSaving("");
    if (error)
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Configuration enregistrée" });
  };

  const authorizedCount = members.filter((m) => m.access_status === "authorized").length;
  const blockedCount = members.filter((m) => m.access_status === "blocked").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Contrôle Portail — Hikvision DS-K1T321MFWX
          </h2>
          <span
            className={`w-3 h-3 rounded-full ${
              connectionStatus === "connected"
                ? "bg-success"
                : connectionStatus === "disconnected"
                ? "bg-destructive"
                : "bg-muted-foreground"
            }`}
            title={
              connectionStatus === "connected"
                ? "Connecté"
                : connectionStatus === "disconnected"
                ? "Déconnecté"
                : "Inconnu"
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing || !gate.controller_ip}
            className="gap-2"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : connectionStatus === "connected" ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            Tester la connexion
          </Button>
          <Button
            onClick={syncMembers}
            disabled={syncing || members.length === 0}
            className="gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Synchroniser les membres
          </Button>
        </div>
      </div>

      {/* Sync progress bar */}
      {syncing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Synchronisation en cours...</span>
            <span>{syncProgress}%</span>
          </div>
          <Progress value={syncProgress} className="h-2" />
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total membres</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{authorizedCount}</p>
              <p className="text-xs text-muted-foreground">Autorisés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{blockedCount}</p>
              <p className="text-xs text-muted-foreground">Bloqués</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members sync table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Membres à synchroniser
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMembers}
              disabled={loadingMembers}
              className="gap-1"
            >
              {loadingMembers ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun membre trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-xs">
                        {member.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>
                        <span
                          className={
                            member.payment_status === "Soldé"
                              ? "text-success"
                              : member.payment_status === "Aucun abonnement"
                              ? "text-muted-foreground"
                              : "text-warning"
                          }
                        >
                          {member.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            member.access_status === "authorized"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            member.access_status === "authorized"
                              ? "bg-success hover:bg-success/80"
                              : ""
                          }
                        >
                          {member.access_status === "authorized"
                            ? "Autorisé"
                            : "Bloqué"}
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

      {/* Gate configuration */}
      <Card className="shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Configuration du Terminal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Adresse IP du contrôleur</Label>
            <Input
              value={gate.controller_ip}
              onChange={(e) => setGate({ ...gate, controller_ip: e.target.value })}
              className="mt-1 font-mono"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <Label className="text-sm">Port</Label>
            <Input
              value={gate.controller_port}
              onChange={(e) => setGate({ ...gate, controller_port: e.target.value })}
              className="mt-1 font-mono"
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Par défaut : 80 (HTTP) ou 443 (HTTPS)
            </p>
          </div>
          <div>
            <Label className="text-sm">Clé API / Mot de passe</Label>
            <Input
              type="password"
              value={gate.api_key}
              onChange={(e) => setGate({ ...gate, api_key: e.target.value })}
              className="mt-1 font-mono"
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Application stricte du paiement</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Refuser l'accès si le solde &gt; 0 MAD
              </p>
            </div>
            <Switch
              checked={gate.strict_payment_enforcement}
              onCheckedChange={(v) =>
                setGate({ ...gate, strict_payment_enforcement: v })
              }
            />
          </div>
          <div className="rounded-lg border border-border p-4 space-y-2 bg-secondary/30">
            <p className="text-sm font-medium">Logique d'accès automatisée</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                <strong className="text-foreground">Accès accordé:</strong> Abonnement
                actif + Reste à payer = 0
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                <strong className="text-foreground">Tolérance:</strong> Expiré &lt;{" "}
                {daysTolerance}j OU Reste à payer &gt; 0
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <strong className="text-foreground">Accès refusé:</strong> Expiré &gt;{" "}
                {daysTolerance}j OU En attente sans paiement
              </p>
            </div>
          </div>
          <Button
            onClick={saveGateConfig}
            disabled={saving === "gate_control"}
            className="gap-2"
          >
            {saving === "gate_control" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
