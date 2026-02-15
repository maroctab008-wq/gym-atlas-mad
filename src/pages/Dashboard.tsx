import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { mockSubscriptions, mockPayments, attendanceData, monthlyIncomeData } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const totalActiveMembers = mockSubscriptions.filter(s => s.status === 'active').length;
const monthlyRevenue = mockPayments.reduce((sum, p) => sum + p.amountMAD, 0);
const unpaidMembers = mockSubscriptions.filter(s => s.paidMAD < s.amountMAD);
const totalUnpaid = unpaidMembers.reduce((sum, s) => sum + (s.amountMAD - s.paidMAD), 0);

const statsCards = [
  { title: 'Membres Actifs', value: totalActiveMembers.toString(), icon: Users, color: 'text-primary bg-primary/10' },
  { title: 'Revenus du Mois', value: formatMAD(monthlyRevenue), icon: TrendingUp, color: 'text-success bg-success/10' },
  { title: 'Impayés', value: formatMAD(totalUnpaid), icon: AlertTriangle, color: 'text-warning bg-warning/10' },
  { title: 'Entrées Aujourd\'hui', value: '47', icon: Activity, color: 'text-info bg-info/10' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tableau de Bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre salle de sport</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                />
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
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatMAD(value), 'Revenus']}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Members */}
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
                  <p className="font-medium text-sm">{sub.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.plan === 'monthly' ? 'Mensuel' : sub.plan === 'quarterly' ? 'Trimestriel' : 'Annuel'} · Expire le {formatDateFR(sub.endDate)}
                  </p>
                </div>
                <Badge variant="outline" className="border-warning/50 text-warning font-mono text-xs">
                  {formatMAD(sub.amountMAD - sub.paidMAD)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
