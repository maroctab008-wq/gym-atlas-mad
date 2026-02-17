import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { Banknote, CreditCard, ArrowRightLeft, FileCheck, Loader2, Receipt, Pencil, FileText, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import NewPaymentDialog from '@/components/NewPaymentDialog';
import ExpenseDialog from '@/components/ExpenseDialog';
import EditPaymentDialog from '@/components/EditPaymentDialog';
import { generateInvoicePDF } from '@/lib/generateInvoicePDF';
import { usePlans } from '@/hooks/usePlans';

const methodConfig: Record<string, { label: string; icon: any; className: string }> = {
  cash: { label: 'Espèces', icon: Banknote, className: 'bg-success/10 text-success border-success/30' },
  tpe: { label: 'TPE', icon: CreditCard, className: 'bg-primary/10 text-primary border-primary/30' },
  cheque: { label: 'Chèque', icon: FileCheck, className: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
  transfer: { label: 'Virement', icon: ArrowRightLeft, className: 'bg-info/10 text-info border-info/30' },
};

const expenseCategoryLabels: Record<string, string> = {
  rent: 'Loyer', electricity: 'Électricité', salaries: 'Salaires',
  maintenance: 'Maintenance', equipment: 'Équipement', other: 'Autre',
};

interface PaymentRow {
  id: string;
  amount_mad: number;
  amount_due: number;
  method: string;
  date: string;
  invoice_number: string | null;
  cheque_number: string | null;
  installment_plan: string | null;
  member_id: string | null;
  member_name: string | null;
  members: { full_name: string; cin: string } | null;
}

interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount_mad: number;
  date: string;
}

interface BrandingData {
  gym_name: string; phone: string; website: string; address: string; ice: string; logo_url: string;
}

export default function Payments() {
  const { role } = useAuth();
  const { can } = usePermissions();
  const { plansMap } = usePlans();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<BrandingData>({ gym_name: 'GymManager', phone: '', website: '', address: '', ice: '', logo_url: '' });

  // Payment filters
  const [payStartDate, setPayStartDate] = useState('');
  const [payEndDate, setPayEndDate] = useState('');

  // Expense filters
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCategory, setExpCategory] = useState('all');

  const fetchData = async () => {
    const [paymentsRes, expensesRes, brandingRes] = await Promise.all([
      supabase.from('payments').select('id, amount_mad, amount_due, method, date, invoice_number, cheque_number, installment_plan, member_id, member_name, members(full_name, cin)').order('date', { ascending: false }),
      supabase.from('expenses').select('id, category, description, amount_mad, date').order('date', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'gym_branding').single(),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRow[]);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (brandingRes.data?.value) setBranding(brandingRes.data.value as unknown as BrandingData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPayments = payments.filter(p => {
    if (payStartDate && p.date < payStartDate) return false;
    if (payEndDate && p.date > payEndDate) return false;
    return true;
  });

  const totalByMethod = (m: string) => filteredPayments.filter(p => p.method === m).reduce((s, p) => s + p.amount_mad, 0);

  const filteredExpenses = expenses.filter(e => {
    if (expStartDate && e.date < expStartDate) return false;
    if (expEndDate && e.date > expEndDate) return false;
    if (expCategory !== 'all' && e.category !== expCategory) return false;
    return true;
  });
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount_mad, 0);

  const handlePrintInvoice = (payment: PaymentRow) => {
    const planLabel = Object.values(plansMap)[0]?.label || 'Abonnement';
    const planMonths = Object.values(plansMap)[0]?.months || 1;
    generateInvoicePDF({
      invoiceNumber: payment.invoice_number || `FAC-${payment.id.slice(0, 8).toUpperCase()}`,
      date: formatDateFR(payment.date),
      memberName: payment.members?.full_name || payment.member_name || '—',
      memberCIN: payment.members?.cin || '',
      planLabel,
      planMonths,
      amountMAD: payment.amount_mad,
      paymentMethod: payment.method,
      chequeNumber: payment.method === 'cheque' ? (payment.cheque_number || undefined) : undefined,
      branding,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
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
          {/* Payment Date Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Date de début</Label>
              <Input type="date" value={payStartDate} onChange={e => setPayStartDate(e.target.value)} className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date de fin</Label>
              <Input type="date" value={payEndDate} onChange={e => setPayEndDate(e.target.value)} className="w-40 h-9" />
            </div>
            {(payStartDate || payEndDate) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setPayStartDate(''); setPayEndDate(''); }}>
                  Réinitialiser
                </Button>
                <div className="ml-auto text-sm font-medium">
                  Total période: <span className="font-semibold">{formatMAD(filteredPayments.reduce((s, p) => s + p.amount_mad, 0))}</span>
                </div>
              </>
            )}
          </div>

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
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Reste</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Statut</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Méthode</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide">Facture</TableHead>
                    {can('payments_create') && <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={can('payments_create') ? 8 : 7} className="text-center py-8 text-muted-foreground">Aucun paiement trouvé</TableCell></TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const mc = methodConfig[payment.method] || methodConfig.cash;
                      const Icon = mc.icon;
                      const reste = payment.amount_due || 0;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="text-muted-foreground text-sm font-mono">{formatDateFR(payment.date)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.members?.full_name || payment.member_name || '—'}
                            {!payment.members && payment.member_name && (
                              <span className="text-xs text-muted-foreground ml-1">(supprimé)</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">{formatMAD(payment.amount_mad)}</TableCell>
                          <TableCell className={`font-mono font-semibold ${reste > 0 ? 'text-destructive' : ''}`}>{formatMAD(reste)}</TableCell>
                          <TableCell>
                            {reste === 0 ? (
                              <Badge className="bg-success/10 text-success border-success/30" variant="outline">Complet</Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning border-warning/30" variant="outline">Partiel</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${mc.className} gap-1`}>
                              <Icon className="w-3 h-3" />{mc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{payment.invoice_number || '—'}</TableCell>
                          {can('payments_create') && (
                            <TableCell>
                              <div className="flex gap-1">
                                <EditPaymentDialog payment={payment} onSuccess={fetchData} />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintInvoice(payment)}>
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                                
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
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {/* Expense Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Du</Label>
              <Input type="date" value={expStartDate} onChange={e => setExpStartDate(e.target.value)} className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Au</Label>
              <Input type="date" value={expEndDate} onChange={e => setExpEndDate(e.target.value)} className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Catégorie</Label>
              <Select value={expCategory} onValueChange={setExpCategory}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(expenseCategoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(expStartDate || expEndDate || expCategory !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setExpStartDate(''); setExpEndDate(''); setExpCategory('all'); }}>
                Réinitialiser
              </Button>
            )}
          </div>

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
                  {filteredExpenses.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune dépense trouvée</TableCell></TableRow>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-muted-foreground text-sm font-mono">{formatDateFR(exp.date)}</TableCell>
                        <TableCell><Badge variant="outline">{expenseCategoryLabels[exp.category] || exp.category}</Badge></TableCell>
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
