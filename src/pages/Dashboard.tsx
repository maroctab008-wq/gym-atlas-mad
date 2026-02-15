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
  { title: 'Membres Actifs', value: totalActiveMembers.toString(), icon: Users, accent: 'cyan' as const },
  { title: 'Revenus du Mois', value: formatMAD(monthlyRevenue), icon: TrendingUp, accent: 'green' as const },
  { title: 'Impayés', value: formatMAD(totalUnpaid), icon: AlertTriangle, accent: 'orange' as const },
  { title: 'Entrées Aujourd\'hui', value: '47', icon: Activity, accent: 'magenta' as const },
];

const accentClasses = {
  cyan: 'neon-glow text-neon-cyan border-primary/30',
  green: 'neon-glow-green text-neon-green border-neon-green/30',
  orange: 'neon-glow-orange text-neon-orange border-neon-orange/30',  
  magenta: 'neon-glow-magenta text-neon-magenta border-neon-magenta/30',
};

const iconBgClasses = {
  cyan: 'bg-primary/10',
  green: 'bg-neon-green/10',
  orange: 'bg-neon-orange/10',
  magenta: 'bg-accent/10',
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wider text-neon-cyan">
          TABLEAU DE BORD
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre salle de sport</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className={`glass-panel border ${accentClasses[stat.accent]} transition-all hover:scale-[1.02]`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{stat.title}</p>
                  <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${iconBgClasses[stat.accent]} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display tracking-wider text-primary">FRÉQUENTATION HEBDOMADAIRE</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 30% 18%)" />
                <XAxis dataKey="day" stroke="hsl(220 20% 55%)" fontSize={12} />
                <YAxis stroke="hsl(220 20% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'hsl(228 45% 10%)', border: '1px solid hsl(185 100% 50% / 0.3)', borderRadius: '8px', color: 'hsl(190 100% 95%)' }}
                />
                <Bar dataKey="entries" fill="hsl(185 100% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display tracking-wider text-primary">REVENUS MENSUELS (MAD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 30% 18%)" />
                <XAxis dataKey="month" stroke="hsl(220 20% 55%)" fontSize={12} />
                <YAxis stroke="hsl(220 20% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'hsl(228 45% 10%)', border: '1px solid hsl(338 100% 58% / 0.3)', borderRadius: '8px', color: 'hsl(190 100% 95%)' }}
                  formatter={(value: number) => [formatMAD(value), 'Revenus']}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(338 100% 58%)" fill="hsl(338 100% 58% / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Members */}
      <Card className="glass-panel border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display tracking-wider text-neon-orange">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              MEMBRES AVEC SOLDE IMPAYÉ
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unpaidMembers.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                <div>
                  <p className="font-medium text-sm">{sub.memberName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {sub.plan === 'monthly' ? 'Mensuel' : sub.plan === 'quarterly' ? 'Trimestriel' : 'Annuel'} · Expire le {formatDateFR(sub.endDate)}
                  </p>
                </div>
                <Badge variant="outline" className="border-neon-orange/50 text-neon-orange font-mono">
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
