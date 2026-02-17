import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePDF } from '@/lib/generateInvoicePDF';
import { formatDateFR } from '@/lib/formatters';
import { usePlans } from '@/hooks/usePlans';

interface MemberOption {
  id: string;
  full_name: string;
  cin: string;
}

interface SubscriptionOption {
  id: string;
  plan: string;
  amount_mad: number;
  paid_mad: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface BrandingData {
  gym_name: string;
  phone: string;
  website: string;
  address: string;
  ice: string;
  logo_url: string;
}

export default function NewPaymentDialog({ onSuccess, triggerClassName }: { onSuccess?: () => void; triggerClassName?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plansMap } = usePlans();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOption[]>([]);
  const [branding, setBranding] = useState<BrandingData>({ gym_name: 'GymManager', phone: '', website: '', address: '', ice: '', logo_url: '' });

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [membersRes, brandingRes] = await Promise.all([
        supabase
          .from('members')
          .select('id, full_name, cin, subscriptions!inner(status)')
          .in('subscriptions.status', ['active', 'pending'])
          .order('full_name'),
        supabase.from('app_settings').select('value').eq('key', 'gym_branding').single(),
      ]);
      if (membersRes.data) {
        // Deduplicate members (a member may have multiple matching subscriptions)
        const uniqueMembers = new Map<string, MemberOption>();
        for (const m of membersRes.data) {
          if (!uniqueMembers.has(m.id)) {
            uniqueMembers.set(m.id, { id: m.id, full_name: m.full_name, cin: m.cin });
          }
        }
        setMembers(Array.from(uniqueMembers.values()));
      }
      if (brandingRes.data?.value) {
        setBranding(brandingRes.data.value as unknown as BrandingData);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!selectedMemberId) { setSubscriptions([]); return; }
    const loadSubs = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('id, plan, amount_mad, paid_mad, start_date, end_date, status')
        .eq('member_id', selectedMemberId)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (data) setSubscriptions(data);
    };
    loadSubs();
  }, [selectedMemberId]);

  const selectedSub = subscriptions.find(s => s.id === selectedSubId);
  const remaining = selectedSub ? selectedSub.amount_mad - selectedSub.paid_mad : 0;
  const amountNum = parseFloat(amount) || 0;
  const resteAPayer = selectedSub ? Math.max(0, remaining - amountNum) : 0;

  const handleSave = async () => {
    if (!selectedMemberId || !amount || !method || !paymentDate) {
      toast({ title: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const invoiceNumber = `FAC-${Date.now().toString(36).toUpperCase()}`;
    const computedReste = selectedSub ? Math.max(0, remaining - amountNum) : 0;

    const { error } = await supabase.from('payments').insert({
      member_id: selectedMemberId,
      subscription_id: selectedSubId || null,
      amount_mad: amountNum,
      method,
      date: paymentDate,
      cheque_number: method === 'cheque' ? chequeNumber : null,
      invoice_number: invoiceNumber,
      amount_due: computedReste,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Update subscription paid_mad if linked
    if (selectedSubId && selectedSub) {
      const newPaid = selectedSub.paid_mad + amountNum;
      const newStatus = newPaid >= selectedSub.amount_mad ? 'active' : 'pending';
      await supabase.from('subscriptions').update({
        paid_mad: newPaid,
        status: newStatus,
      }).eq('id', selectedSubId);
    }

    // Audit log
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'create',
        entity_type: 'payment',
        entity_id: invoiceNumber,
        details: { member_id: selectedMemberId, amount: amountNum, method },
      });
    }

    // Generate PDF
    const member = members.find(m => m.id === selectedMemberId);
    const planKey = selectedSub?.plan || 'monthly';
    const planConfig = plansMap[planKey] || { label: planKey, months: 1, priceMAD: amountNum };

    generateInvoicePDF({
      invoiceNumber,
      date: formatDateFR(paymentDate),
      memberName: member?.full_name || '',
      memberCIN: member?.cin || '',
      planLabel: planConfig.label,
      planMonths: planConfig.months,
      amountMAD: amountNum,
      paymentMethod: method,
      chequeNumber: method === 'cheque' ? chequeNumber : undefined,
      branding,
    });

    toast({ title: 'Paiement enregistré', description: `Facture ${invoiceNumber} générée` });
    setSaving(false);
    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setSelectedMemberId('');
    setSelectedSubId('');
    setAmount('');
    setMethod('');
    setChequeNumber('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className={`gap-2 ${triggerClassName || ''}`}>
          <Plus className="w-4 h-4" />
          Nouveau Paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Nouveau Paiement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Membre</Label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.cin})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subscriptions.length > 0 && (
            <div>
              <Label className="text-sm">Abonnement</Label>
              <Select value={selectedSubId} onValueChange={(v) => {
                setSelectedSubId(v);
                const sub = subscriptions.find(s => s.id === v);
                if (sub) setAmount(String(sub.amount_mad - sub.paid_mad));
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Lier à un abonnement" /></SelectTrigger>
                <SelectContent>
                  {subscriptions.map(s => {
                    const rest = s.amount_mad - s.paid_mad;
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {plansMap[s.plan]?.label || s.plan} — Reste: {rest.toLocaleString('fr-FR')} MAD
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedSub && remaining > 0 && (
                <p className="text-xs text-warning mt-1">Solde restant: {remaining.toLocaleString('fr-FR')} MAD</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-sm">Montant (MAD)</Label>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" placeholder="Ex: 300" />
          </div>

          <div>
            <Label className="text-sm">Date</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Méthode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="tpe">TPE</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'cheque' && (
            <div>
              <Label className="text-sm">Numéro de chèque</Label>
              <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="mt-1" placeholder="Ex: 1234567" />
            </div>
          )}

          {selectedSub && (
            <div>
              <Label className="text-sm">Reste à payer</Label>
              <Input
                type="text"
                readOnly
                value={`${resteAPayer.toLocaleString('fr-FR')} MAD`}
                className={`mt-1 font-semibold ${resteAPayer > 0 ? 'text-destructive' : 'text-success'}`}
              />
            </div>
          )}

          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Enregistrer & Générer Facture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
