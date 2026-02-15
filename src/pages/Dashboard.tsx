import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingUp, AlertTriangle, Activity, Receipt, DollarSign, Loader2 } from 'lucide-react';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PaymentRow { id: string; amount_mad: number; date: string; method: string; members: { full_name: string } | null; }
interface ExpenseRow { id: string; category: string; description: string | null; amount_mad: number; date: string; }
interface SubRow { id: string; status: string; amount_mad: number; paid_mad: number; end_date: string; plan: string; members: { full_name: string } | null; }

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Loyer', electricity: 'Électricité', salaries: 'Salaires',
  maintenance: 'Maintenance', equipment: 'Équipement', other: 'Autre',
};

const attendanceData = [
  { day: 'Lun', entries: 45 }, { day: 'Mar', entries: 52 }, { day: 'Mer', entries: 38 },
  { day: 'Jeu', entries: 61 }, { day: 'Ven', entries: 55 }, { day: 'Sam', entries: 70 }, { day: 'Dim', entries: 25 },
];

export default function Dashboard() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    const load = async () => {
      const [pRes, eRes, sRes] = await Promise.all([
        supabase.from('payments').select('id, amount_mad, date, method, members(full_name)').order('date', { ascending: false }),
        supabase.from('expenses').select('id, category, description, amount_mad, date').order('date', { ascending: false }),
        supabase.from('subscriptions').select('id, status, amount_mad, paid_mad, end_date, plan, members(full_name)'),
      ]);
      if (pRes.data) setPayments(pRes.data as PaymentRow[]);
      if (eRes.data) setExpenses(eRes.data);
      if (sRes.data) setSubs(sRes.data as SubRow[]);
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

  const totalActiveMembers = subs.filter(s => s.status === 'active').length;
  const unpaidMembers = subs.filter(s => s.paid_mad < s.amount_mad);
  const totalUnpaid = unpaidMembers.reduce((sum, s) => sum + (s.amount_mad - s.paid_mad), 0);

  const monthlyIncomeData = useMemo(() => {
    const months: Record<string, number> = {};
    payments.forEach(p => {
      const m = p.date.substring(0, 7);
      months[m] = (months[m] || 0) + p.amount_mad;
    });
    return Object.entries(months).sort().slice(-6).map(([month, income]) => ({ month, income }));
  }, [payments]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const statsCards = [
    { title: 'Membres Actifs', value: totalActiveMembers.toString(), icon: Users, color: 'text-primary bg-primary/10' },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fréquentation Hebdomadaire</CardTitle>
          </CardHeader>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus Mensuels (MAD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(value: number) => [formatMAD(value), 'Revenus']} />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Income & Expenses side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Revenus Récents
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
              <Receipt className="w-4 h-4 text-destructive" />
              Dépenses Récentes
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

      {/* Unpaid Members */}
      {unpaidMembers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Membres avec Solde Impayé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidMembers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{sub.members?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.plan === 'monthly' ? 'Mensuel' : sub.plan === 'quarterly' ? 'Trimestriel' : 'Annuel'} · Expire le {formatDateFR(sub.end_date)}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-warning/50 text-warning font-mono text-xs">
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
