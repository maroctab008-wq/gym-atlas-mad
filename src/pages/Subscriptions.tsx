import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockSubscriptions } from '@/data/mockData';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { PLANS } from '@/types/gym';

const statusConfig = {
  active: { label: 'Actif', className: 'bg-success/10 text-success border-success/30' },
  expired: { label: 'Expiré', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  pending: { label: 'En Attente', className: 'bg-warning/10 text-warning border-warning/30' },
};

export default function Subscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Abonnements</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion des plans et statuts</p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <Card key={key} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{plan.label}</p>
              <p className="text-3xl font-semibold text-primary mt-2">{formatMAD(plan.priceMAD)}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.months} mois</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSubscriptions.map((sub) => {
                const st = statusConfig[sub.status];
                const remaining = sub.amountMAD - sub.paidMAD;
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.memberName}</TableCell>
                    <TableCell className="text-sm">{PLANS[sub.plan].label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st.className}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.startDate)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.endDate)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatMAD(sub.paidMAD)}</TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="font-mono text-sm text-warning">{formatMAD(remaining)}</span>
                      ) : (
                        <span className="font-mono text-sm text-success">0 MAD</span>
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
