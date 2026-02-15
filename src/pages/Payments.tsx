import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockPayments } from '@/data/mockData';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { Banknote, CreditCard, ArrowRightLeft } from 'lucide-react';

const methodConfig = {
  cash: { label: 'Espèces', icon: Banknote, className: 'bg-success/10 text-success border-success/30' },
  tpe: { label: 'TPE', icon: CreditCard, className: 'bg-primary/10 text-primary border-primary/30' },
  transfer: { label: 'Virement', icon: ArrowRightLeft, className: 'bg-info/10 text-info border-info/30' },
};

export default function Payments() {
  const totalCash = mockPayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amountMAD, 0);
  const totalTPE = mockPayments.filter(p => p.method === 'tpe').reduce((s, p) => s + p.amountMAD, 0);
  const totalTransfer = mockPayments.filter(p => p.method === 'transfer').reduce((s, p) => s + p.amountMAD, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Paiements</h1>
        <p className="text-muted-foreground text-sm mt-1">Historique des transactions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Espèces', amount: totalCash, ...methodConfig.cash },
          { label: 'TPE', amount: totalTPE, ...methodConfig.tpe },
          { label: 'Virement', amount: totalTransfer, ...methodConfig.transfer },
        ].map((item) => (
          <Card key={item.label} className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.className.split(' ')[0]}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{item.label}</p>
                <p className="text-xl font-semibold">{formatMAD(item.amount)}</p>
              </div>
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
                <TableHead className="text-xs font-medium uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Membre</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Montant</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Méthode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((payment) => {
                const mc = methodConfig[payment.method];
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground text-sm font-mono">{formatDateFR(payment.date)}</TableCell>
                    <TableCell className="font-medium">{payment.memberName}</TableCell>
                    <TableCell className="font-mono font-semibold">{formatMAD(payment.amountMAD)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${mc.className} gap-1`}>
                        <mc.icon className="w-3 h-3" />
                        {mc.label}
                      </Badge>
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
