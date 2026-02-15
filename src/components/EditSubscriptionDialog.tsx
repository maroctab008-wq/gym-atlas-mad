import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PLANS } from '@/types/gym';

interface SubData {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_mad: number;
  paid_mad: number;
  member_name: string;
}

export default function EditSubscriptionDialog({ sub, onSuccess }: { sub: SubData; onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endDate, setEndDate] = useState(sub.end_date);
  const [amountMad, setAmountMad] = useState(String(sub.amount_mad));
  const [status, setStatus] = useState(sub.status);
  const [reason, setReason] = useState('');

  const handleSave = async () => {
    if (!reason.trim()) {
      toast({ title: 'Veuillez indiquer la raison de la modification', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const newAmount = parseFloat(amountMad);
    const changes: Record<string, any> = {};
    if (endDate !== sub.end_date) changes.end_date = endDate;
    if (newAmount !== sub.amount_mad) changes.amount_mad = newAmount;
    if (status !== sub.status) changes.status = status;

    if (Object.keys(changes).length === 0) {
      toast({ title: 'Aucune modification détectée' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('subscriptions').update(changes).eq('id', sub.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'subscription',
          entity_id: sub.id,
          details: { member: sub.member_name, changes, reason, previous: { end_date: sub.end_date, amount_mad: sub.amount_mad, status: sub.status } },
        });
      }
      toast({ title: 'Abonnement modifié' });
      setOpen(false);
      setReason('');
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="w-3 h-3" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Modifier — {sub.member_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Plan actuel</Label>
            <p className="text-sm font-medium mt-1">{PLANS[sub.plan]?.label || sub.plan}</p>
          </div>
          <div>
            <Label className="text-sm">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pending">En Attente</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Date de fin</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Montant (MAD)</Label>
            <Input type="number" min="0" value={amountMad} onChange={e => setAmountMad(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Raison de la modification *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-1" placeholder="Ex: Extension accordée suite à blessure" rows={2} />
          </div>
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Enregistrer les modifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
