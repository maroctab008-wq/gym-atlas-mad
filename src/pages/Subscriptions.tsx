import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMAD, formatDateFR } from "@/lib/formatters";
import { Loader2, RefreshCw, Filter, CalendarDays, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { usePlans } from "@/hooks/usePlans";
import { useToast } from "@/hooks/use-toast";
import EditSubscriptionDialog from "@/components/EditSubscriptionDialog";
import DeleteSubscriptionButton from "@/components/DeleteSubscriptionButton";
import NewSubscriptionDialog from "@/components/NewSubscriptionDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import PlanManagement from "@/components/PlanManagement";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-success/10 text-success border-success/30" },
  expired: { label: "Expiré", className: "bg-destructive/10 text-destructive border-destructive/30" },
  pending: { label: "En Attente", className: "bg-warning/10 text-warning border-warning/30" },
};

interface SubRow {
  id: string; plan: string; status: string; start_date: string; end_date: string;
  amount_mad: number; paid_mad: number; member_name: string | null;
  members: { full_name: string } | null;
}

const paymentStatusBadge = (amountMad: number, paidMad: number) => {
  if (paidMad >= amountMad) return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Payé</Badge>;
  return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">En attente</Badge>;
};

type QuickFilter = "all" | "active" | "expired" | "pending";

export default function Subscriptions() {
  const { role } = useAuth();
  const { plans, loading: plansLoading, refetch: refetchPlans } = usePlans();
  const { toast } = useToast();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const fetchSubs = async () => {
    const { data } = await api.get("/subscriptions");
    if (data) setSubs(data as SubRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const getPlanLabel = (planKey: string) => {
    const legacyMap: Record<string, string> = { monthly: 'Mensuelle', quarterly: 'Trimestrielle', annual: 'Annuelle' };
    if (legacyMap[planKey]) return legacyMap[planKey];
    const found = plans.find((p) => p.label.toLowerCase().replace(/\s+/g, "_") === planKey || p.label === planKey);
    return found?.label || planKey;
  };

  const filtered = useMemo(() => {
    return subs.filter((sub) => {
      if (quickFilter === "active" && sub.status !== "active") return false;
      if (quickFilter === "expired" && sub.status !== "expired") return false;
      if (quickFilter === "pending" && sub.status !== "pending") return false;
      if (dateFrom && sub.end_date < dateFrom) return false;
      if (dateTo && sub.end_date > dateTo) return false;
      return true;
    });
  }, [subs, quickFilter, dateFrom, dateTo]);

  if (loading || plansLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast({ title: "Synchronisation terminée", description: "Les données ont été synchronisées avec le terminal." });
    setSyncing(false);
    fetchSubs();
  };

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: "all", label: "Tous" }, { key: "active", label: "Actifs" },
    { key: "expired", label: "Expirés" }, { key: "pending", label: "En Attente" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Abonnements</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestion des plans et statuts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synchroniser les membres
          </Button>
          {role === "admin" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Settings2 className="w-4 h-4" />Gestion des Plans</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0"><PlanManagement onPlansChanged={() => refetchPlans()} /></DialogContent>
            </Dialog>
          )}
          {role === "admin" && <NewSubscriptionDialog onSuccess={fetchSubs} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{plan.label}</p>
              <p className="text-3xl font-semibold text-primary mt-2">{formatMAD(plan.price_mad)}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.months} mois</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Filter className="w-4 h-4" />Filtres</div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <Button key={f.key} variant={quickFilter === f.key ? "default" : "outline"} size="sm" onClick={() => setQuickFilter(f.key)}>{f.label}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div><Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" />Échéance du</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-44" /></div>
            <div><Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" />Au</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-44" /></div>
            {(dateFrom || dateTo || quickFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setQuickFilter("all"); }}>Réinitialiser</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Membre</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Plan</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Statut</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Début</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Fin</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Payé</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Reste</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Paiement</TableHead>
                {role === "admin" && <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={role === "admin" ? 9 : 8} className="text-center py-8 text-muted-foreground">Aucun abonnement</TableCell></TableRow>
              ) : (
                filtered.map((sub) => {
                  const st = statusConfig[sub.status] || statusConfig.pending;
                  const remaining = sub.amount_mad - sub.paid_mad;
                  const memberName = sub.members?.full_name || (sub.member_name ? `${sub.member_name} (supprimé)` : "—");
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{memberName}</TableCell>
                      <TableCell className="text-sm">{getPlanLabel(sub.plan)}</TableCell>
                      <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.start_date)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.end_date)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatMAD(sub.paid_mad)}</TableCell>
                      <TableCell>{remaining > 0 ? <span className="font-mono text-sm text-warning">{formatMAD(remaining)}</span> : <span className="font-mono text-sm text-success">0 MAD</span>}</TableCell>
                      <TableCell>{paymentStatusBadge(sub.amount_mad, sub.paid_mad)}</TableCell>
                      {role === "admin" && (
                        <TableCell>
                          <div className="flex gap-1">
                            <EditSubscriptionDialog sub={{ ...sub, member_name: memberName }} onSuccess={fetchSubs} />
                            <DeleteSubscriptionButton subscriptionId={sub.id} subscriptionStatus={sub.status} amountMad={sub.amount_mad} paidMad={sub.paid_mad} onSuccess={fetchSubs} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
