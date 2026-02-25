import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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

export default function NewPaymentDialog({ onSuccess, triggerClassName }: { onSuccess?: () => void; triggerClassName?: string }) {
  const { toast } = useToast();
  const { plansMap } = usePlans();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOption[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    api.get('/payments/members-with-subs').then(({ data }) => {
      if (data) setMembers(data);
    });
  }, [open]);

  useEffect(() => {
    if (!selectedMemberId) { setSubscriptions([]); return; }
    api.get(`/subscriptions/by-member/${selectedMemberId}`).then(({ data }) => {
      if (data) setSubscriptions(data);
    });
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

    const member = members.find(m => m.id === selectedMemberId);
    const { data, error } = await api.post('/payments', {
      member_id: selectedMemberId,
      member_name: member?.full_name || '',
      subscription_id: selectedSubId || null,
      amount_mad: amountNum,
      method,
      date: paymentDate,
      cheque_number: method === 'cheque' ? chequeNumber : null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({ title: 'Paiement enregistré', description: `Facture ${data?.invoice_number || ''} disponible au téléchargement.` });
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
