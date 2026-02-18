import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingUp, AlertTriangle, Receipt, DollarSign, Loader2, Bell, Clock, Hourglass } from 'lucide-react';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PaymentRow { id: string; amount_mad: number; date: string; method: string; members: { full_name: string } | null; }
interface ExpenseRow { id: string; category: string; description: string | null; amount_mad: number; date: string; }
interface SubRow { id: string; status: string; amount_mad: number; paid_mad: number; end_date: string; start_date: string; plan: string; members: { full_name: string } | null; }

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Loyer', electricity: 'Électricité', salaries: 'Salaires',
  maintenance: 'Maintenance', equipment: 'Équipement', other: 'Autre',
};

const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface AccessLogRow { id: string; timestamp: string; status: string; }

export default function Dashboard() {
  const { role } = useAuth();
  const { can } = usePermissions();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogRow[]>([]);
  const [daysTolerance, setDaysTolerance] = useState(3);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    const load = async () => {
      // Get start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const [pRes, eRes, sRes, aRes, settingsRes] = await Promise.all([
        supabase.from('payments').select('id, amount_mad, date, method, members(full_name)').order('date', { ascending: false }),
        supabase.from('expenses').select('id, category, description, amount_mad, date').order('date', { ascending: false }),
        supabase.from('subscriptions').select('id, status, amount_mad, paid_mad, end_date, start_date, plan, members(full_name)'),
        supabase.from('access_logs').select('id, timestamp, status').gte('timestamp', monday.toISOString()),
        supabase.from('app_settings').select('value').eq('key', 'access_rules').maybeSingle(),
      ]);
      if (pRes.data) setPayments(pRes.data as PaymentRow[]);
      if (eRes.data) setExpenses(eRes.data);
      if (sRes.data) setSubs(sRes.data as SubRow[]);
      if (aRes.data) setAccessLogs(aRes.data);
      if (settingsRes.data) {
        const v = settingsRes.data.value as Record<string, any>;
        setDaysTolerance(v.days_tolerance ?? 3);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const pFiltered = payments.filter(p => p.date >= startDate && p.date <= endDate);
    const eFiltered = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    const totalRevenue = pFiltered.reduce((s, p) => s + p.amount_mad, 0);
    const totalExpenses = eFiltered.reduce((s, e) => s + e.amount_mad, 0);
    return { payments: pFiltered, expenses: eFiltered, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
  }, [payments, expenses, startDate, endDate]);

  const attendanceData = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    accessLogs.forEach(log => {
      const d = new Date(log.timestamp).getDay();
      counts[d]++;
    });
    // Order: Lun(1) -> Dim(0)
    return [1, 2, 3, 4, 5, 6, 0].map(d => ({ day: dayLabels[d], entries: counts[d] }));
  }, [accessLogs]);

  const totalActiveMembers = subs.filter(s => s.status === 'active').length;
  const totalExpiredMembers = subs.filter(s => s.status === 'expired').length;
  const totalPendingSubs = subs.filter(s => s.status === 'pending').length;
  const now = new Date();

  // Tolerance alerts: members in orange zone (expired within tolerance OR active with balance)
  const toleranceAlerts = subs.filter(s => {
    const endDate = new Date(s.end_date);
    const daysSinceExpiry = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = s.status === 'expired' || daysSinceExpiry > 0;
    const hasBalance = s.paid_mad < s.amount_mad;
    // Orange: expired within tolerance OR active with balance
    if (isExpired && daysSinceExpiry >= 0 && daysSinceExpiry <= daysTolerance) return true;
    if (!isExpired && hasBalance) return true;
    return false;
  });

  // Unpaid logic with tolerance-based grace period
  const unpaidMembers = subs.filter(s => {
    if (s.paid_mad >= s.amount_mad) return false;
    const endDate = new Date(s.end_date);
    const daysPastDue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysPastDue >= 0 && daysPastDue <= daysTolerance;
  });

  const overdueMembers = subs.filter(s => {
    if (s.paid_mad >= s.amount_mad) return false;
    const endDate = new Date(s.end_date);
    const daysPastDue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysPastDue > daysTolerance;
  });

  const totalUnpaid = unpaidMembers.reduce((sum, s) => sum + (s.amount_mad - s.paid_mad), 0);

  const monthlyIncomeData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    payments.forEach(p => { const m = p.date.substring(0, 7); if (!months[m]) months[m] = { income: 0, expenses: 0 }; months[m].income += p.amount_mad; });
    expenses.forEach(e => { const m = e.date.substring(0, 7); if (!months[m]) months[m] = { income: 0, expenses: 0 }; months[m].expenses += e.amount_mad; });
    return Object.entries(months).sort().slice(-6).map(([month, data]) => ({ month, ...data }));
  }, [payments, expenses]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  // Staff sees only attendance overview, no financial data
  if (!can('view_dashboard_kpis')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tableau de Bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Membres Actifs</p>
                  <p className="text-2xl font-semibold mt-1">{totalActiveMembers}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fréquentation Hebdomadaire</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="entries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    { title: 'Membres Actifs', value: totalActiveMembers.toString(), icon: Users, color: 'text-primary bg-primary/10' },
    { title: 'Expirés', value: totalExpiredMembers.toString(), icon: Clock, color: 'text-destructive bg-destructive/10' },
    { title: 'En Attente', value: totalPendingSubs.toString(), icon: Hourglass, color: 'text-warning bg-warning/10' },
    { title: 'Revenus (Période)', value: formatMAD(filtered.totalRevenue), icon: TrendingUp, color: 'text-success bg-success/10' },
    { title: 'Dépenses (Période)', value: formatMAD(filtered.totalExpenses), icon: Receipt, color: 'text-destructive bg-destructive/10' },
    { title: 'Bénéfice Net', value: formatMAD(filtered.netProfit), icon: DollarSign, color: filtered.netProfit >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10' },
    { title: 'Impayés', value: formatMAD(totalUnpaid), icon: AlertTriangle, color: 'text-warning bg-warning/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tableau de Bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre salle de sport</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Du</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 h-9" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Au</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 h-9" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fréquentation Hebdomadaire</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="entries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Revenus vs Dépenses (Mensuels)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(value: number) => [formatMAD(value)]} />
                <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Revenus" />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />Revenus Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{p.members?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateFR(p.date)}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-success">+{formatMAD(p.amount_mad)}</span>
                </div>
              ))}
              {filtered.payments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun revenu sur cette période</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-destructive" />Dépenses Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.expenses.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{expenseCategoryLabels[e.category] || e.category}</p>
                    <p className="text-xs text-muted-foreground">{e.description || formatDateFR(e.date)}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-destructive">-{formatMAD(e.amount_mad)}</span>
                </div>
              ))}
              {filtered.expenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense sur cette période</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {toleranceAlerts.length > 0 && (
        <Card className="shadow-sm border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Alertes Accès — Période de Tolérance
              <Badge className="ml-auto text-xs bg-warning/20 text-warning border-warning/40">{toleranceAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Ces membres sont en accès orange (tolérance {daysTolerance}j). Merci de les interpeller pour régularisation.</p>
            <div className="space-y-2">
              {toleranceAlerts.map((sub) => {
                const endDate = new Date(sub.end_date);
                const daysSinceExpiry = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                const hasBalance = sub.paid_mad < sub.amount_mad;
                const reason = daysSinceExpiry > 0
                  ? `Expiré depuis ${daysSinceExpiry}j`
                  : hasBalance ? 'Reste à payer' : '';
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                      <div>
                        <p className="font-medium text-sm">{sub.members?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{reason}</p>
                      </div>
                    </div>
                    {hasBalance && (
                      <Badge variant="outline" className="border-warning/50 text-warning font-mono text-xs">
                        {formatMAD(sub.amount_mad - sub.paid_mad)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {unpaidMembers.length > 0 && (
        <Card className="shadow-sm border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
              <Bell className="w-4 h-4" />
              Notifications — Membres Impayés
              <Badge variant="destructive" className="ml-auto text-xs">{unpaidMembers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidMembers.map((sub) => {
                const endDate = new Date(sub.end_date);
                const daysPastDue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <div>
                        <p className="font-medium text-sm">{sub.members?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          Échéance : {formatDateFR(sub.end_date)} — {daysPastDue > 0 ? `${daysPastDue}j de retard` : "Échéance aujourd'hui"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-destructive/50 text-destructive font-mono text-xs">
                      {formatMAD(sub.amount_mad - sub.paid_mad)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {overdueMembers.length > 0 && (
        <Card className="shadow-sm border-destructive/30 opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Membres Abandonnés (+ {daysTolerance}j de retard)
              <Badge variant="destructive" className="ml-auto text-xs">{overdueMembers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueMembers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm line-through text-muted-foreground">{sub.members?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">Statut : Inactif/Abandonné</p>
                  </div>
                  <Badge variant="outline" className="border-muted text-muted-foreground font-mono text-xs">
                    {formatMAD(sub.amount_mad - sub.paid_mad)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
