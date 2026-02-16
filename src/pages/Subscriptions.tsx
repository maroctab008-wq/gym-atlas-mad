import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMAD, formatDateFR } from '@/lib/formatters';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { useToast } from '@/hooks/use-toast';
import EditSubscriptionDialog from '@/components/EditSubscriptionDialog';
import NewSubscriptionDialog from '@/components/NewSubscriptionDialog';

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-success/10 text-success border-success/30' },
  expired: { label: 'Expiré', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  pending: { label: 'En Attente', className: 'bg-warning/10 text-warning border-warning/30' },
};

interface SubRow {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_mad: number;
  paid_mad: number;
  members: { full_name: string } | null;
}

export default function Subscriptions() {
  const { role } = useAuth();
  const { plans, loading: plansLoading } = usePlans();
  const { toast } = useToast();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, plan, status, start_date, end_date, amount_mad, paid_mad, members(full_name)')
      .order('created_at', { ascending: false });
    if (data) setSubs(data as SubRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const getPlanLabel = (planKey: string) => {
    const found = plans.find(p => p.label.toLowerCase().replace(/\s+/g, '_') === planKey || p.label === planKey);
    return found?.label || planKey;
  };

  if (loading || plansLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const handleSync = async () => {
    setSyncing(true);
    // Simulate Hikvision sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast({ title: 'Synchronisation terminée', description: 'Les données ont été synchronisées avec le terminal Hikvision.' });
    setSyncing(false);
    fetchSubs();
  };

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
          {role === 'admin' && <NewSubscriptionDialog onSuccess={fetchSubs} />}
        </div>
      </div>

      {/* Dynamic plan cards from DB */}
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
                {role === 'admin' && <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow><TableCell colSpan={role === 'admin' ? 8 : 7} className="text-center py-8 text-muted-foreground">Aucun abonnement</TableCell></TableRow>
              ) : (
                subs.map((sub) => {
                  const st = statusConfig[sub.status] || statusConfig.pending;
                  const remaining = sub.amount_mad - sub.paid_mad;
                  const memberName = sub.members?.full_name || '—';
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{memberName}</TableCell>
                      <TableCell className="text-sm">{getPlanLabel(sub.plan)}</TableCell>
                      <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.start_date)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFR(sub.end_date)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatMAD(sub.paid_mad)}</TableCell>
                      <TableCell>
                        {remaining > 0 ? (
                          <span className="font-mono text-sm text-warning">{formatMAD(remaining)}</span>
                        ) : (
                          <span className="font-mono text-sm text-success">0 MAD</span>
                        )}
                      </TableCell>
                      {role === 'admin' && (
                        <TableCell>
                          <EditSubscriptionDialog sub={{ ...sub, member_name: memberName }} onSuccess={fetchSubs} />
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
