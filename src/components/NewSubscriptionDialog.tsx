import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

interface MemberOption { id: string; full_name: string; }

export default function NewSubscriptionDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const { plans } = usePlans();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      supabase.from('members').select('id, full_name').order('full_name').then(({ data }) => {
        if (data) setMembers(data);
      });
    }
  }, [open]);

  useEffect(() => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan && startDate) {
      const end = addMonths(new Date(startDate), selectedPlan.months);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [planId, startDate, plans]);

  const selectedPlan = plans.find(p => p.id === planId);

  const handleSave = async () => {
    if (!memberId || !planId || !startDate || !endDate) {
      toast({ title: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const plan = plans.find(p => p.id === planId);
    if (!plan) { setSaving(false); return; }

    const planKeyMap: Record<number, string> = { 1: 'monthly', 3: 'quarterly', 12: 'annual' };
    const planKey = planKeyMap[plan.months] || 'monthly';

    // 1. Create subscription and get its ID
    const { data: subData, error: subError } = await supabase.from('subscriptions').insert({
      member_id: memberId,
      plan: planKey,
      start_date: startDate,
      end_date: endDate,
      amount_mad: plan.price_mad,
      paid_mad: 0,
      status: 'pending',
    }).select('id').single();

    if (subError || !subData) {
      toast({ title: 'Erreur', description: subError?.message || 'Impossible de créer l\'abonnement', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 2. Create linked payment with auto-generated invoice number
    const invoiceNumber = `FAC-${Date.now().toString(36).toUpperCase()}`;
    const { error: payError } = await supabase.from('payments').insert({
      member_id: memberId,
      subscription_id: subData.id,
      amount_mad: plan.price_mad,
      method: 'cash',
      date: startDate,
      invoice_number: invoiceNumber,
    });

    if (payError) {
      // Rollback: delete the subscription if payment creation fails
      await supabase.from('subscriptions').delete().eq('id', subData.id);
      toast({ title: 'Erreur', description: 'Impossible de créer le paiement. L\'abonnement a été annulé.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 3. Audit log
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id, action: 'create', entity_type: 'subscription',
        details: { member_id: memberId, plan: plan.label, start_date: startDate, end_date: endDate, invoice_number: invoiceNumber },
      });
    }

    toast({ title: 'Abonnement créé', description: `Facture ${invoiceNumber} générée automatiquement` });
    setOpen(false);
    setMemberId(''); setPlanId('');
    onSuccess?.();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Ajouter un abonnement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvel Abonnement</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Membre</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label} — {p.price_mad} MAD / {p.months} mois</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Date de début</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Date de fin</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          {selectedPlan && (
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <span className="text-muted-foreground">Montant : </span>
              <span className="font-semibold">{selectedPlan.price_mad} MAD</span>
              <span className="text-muted-foreground ml-2">· Statut : </span>
              <span className="font-semibold text-warning">En attente</span>
            </div>
          )}
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer l'abonnement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
