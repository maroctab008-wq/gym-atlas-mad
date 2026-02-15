import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockSubscriptions } from '@/data/mockData';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { PLANS } from '@/types/gym';

const statusConfig = {
  active: { label: 'Actif', className: 'bg-neon-green/10 text-neon-green border-neon-green/30' },
  expired: { label: 'Expiré', className: 'bg-neon-red/10 text-neon-red border-neon-red/30' },
  pending: { label: 'En Attente', className: 'bg-neon-orange/10 text-neon-orange border-neon-orange/30' },
};

export default function Subscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wider text-neon-cyan">ABONNEMENTS</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion des plans et statuts</p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <Card key={key} className="glass-panel border-primary/20 hover:neon-glow transition-all">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">{plan.label}</p>
              <p className="text-3xl font-display font-bold text-primary mt-2">{formatMAD(plan.priceMAD)}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.months} mois</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-panel border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-display text-xs tracking-wider text-primary">MEMBRE</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">PLAN</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">STATUT</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">DÉBUT</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">FIN</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">PAYÉ</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">RESTE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSubscriptions.map((sub) => {
                const st = statusConfig[sub.status];
                const remaining = sub.amountMAD - sub.paidMAD;
                return (
                  <TableRow key={sub.id} className="border-border/30 hover:bg-primary/5">
                    <TableCell className="font-medium">{sub.memberName}</TableCell>
                    <TableCell className="font-mono text-sm">{PLANS[sub.plan].label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st.className}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.startDate)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.endDate)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatMAD(sub.paidMAD)}</TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="font-mono text-sm text-neon-orange">{formatMAD(remaining)}</span>
                      ) : (
                        <span className="font-mono text-sm text-neon-green">0 MAD</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
