import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { Banknote, CreditCard, ArrowRightLeft, FileCheck, Loader2, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import NewPaymentDialog from '@/components/NewPaymentDialog';
import ExpenseDialog from '@/components/ExpenseDialog';

const methodConfig: Record<string, { label: string; icon: any; className: string }> = {
  cash: { label: 'Espèces', icon: Banknote, className: 'bg-success/10 text-success border-success/30' },
  tpe: { label: 'TPE', icon: CreditCard, className: 'bg-primary/10 text-primary border-primary/30' },
  cheque: { label: 'Chèque', icon: FileCheck, className: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
  transfer: { label: 'Virement', icon: ArrowRightLeft, className: 'bg-info/10 text-info border-info/30' },
};

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Loyer',
  electricity: 'Électricité',
  salaries: 'Salaires',
  maintenance: 'Maintenance',
  equipment: 'Équipement',
  other: 'Autre',
};

interface PaymentRow {
  id: string;
  amount_mad: number;
  method: string;
  date: string;
  invoice_number: string | null;
  cheque_number: string | null;
  installment_plan: string | null;
  members: { full_name: string } | null;
}

interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount_mad: number;
  date: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [paymentsRes, expensesRes] = await Promise.all([
      supabase.from('payments').select('id, amount_mad, method, date, invoice_number, cheque_number, installment_plan, members(full_name)').order('date', { ascending: false }),
      supabase.from('expenses').select('id, category, description, amount_mad, date').order('date', { ascending: false }),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRow[]);
    if (expensesRes.data) setExpenses(expensesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalByMethod = (m: string) => payments.filter(p => p.method === m).reduce((s, p) => s + p.amount_mad, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_mad, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Paiements & Dépenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Historique des transactions et dépenses</p>
        </div>
        <div className="flex gap-2">
          <NewPaymentDialog onSuccess={fetchData} />
          <ExpenseDialog onSuccess={fetchData} />
        </div>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {(['cash', 'tpe', 'cheque', 'transfer'] as const).map((key) => {
              const mc = methodConfig[key];
              const Icon = mc.icon;
              return (
                <Card key={key} className="shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mc.className.split(' ')[0]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{mc.label}</p>
                      <p className="text-xl font-semibold">{formatMAD(totalByMethod(key))}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Date</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Membre</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Montant</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Méthode</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Échéancier</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun paiement enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => {
                      const mc = methodConfig[payment.method] || methodConfig.cash;
                      const Icon = mc.icon;
                      const planLabel = payment.installment_plan === '2x' ? '2 fois' : payment.installment_plan === '3x' ? '3 fois' : 'Total';
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="text-muted-foreground text-sm font-mono">{formatDateFR(payment.date)}</TableCell>
                          <TableCell className="font-medium">{payment.members?.full_name || '—'}</TableCell>
                          <TableCell className="font-mono font-semibold">{formatMAD(payment.amount_mad)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${mc.className} gap-1`}>
                              <Icon className="w-3 h-3" />
                              {mc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{planLabel}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {payment.invoice_number || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-destructive/10">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Dépenses</p>
                <p className="text-xl font-semibold">{formatMAD(totalExpenses)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Date</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Catégorie</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Description</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucune dépense enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-muted-foreground text-sm font-mono">{formatDateFR(exp.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expenseCategoryLabels[exp.category] || exp.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{exp.description || '—'}</TableCell>
                        <TableCell className="font-mono font-semibold text-destructive">{formatMAD(exp.amount_mad)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
