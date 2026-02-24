import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PLANS } from '@/types/gym';

interface SubData { id: string; plan: string; status: string; start_date: string; end_date: string; amount_mad: number; paid_mad: number; member_name: string; }

export default function EditSubscriptionDialog({ sub, onSuccess }: { sub: SubData; onSuccess?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endDate, setEndDate] = useState(sub.end_date);
  const [amountMad, setAmountMad] = useState(String(sub.amount_mad));
  const [status, setStatus] = useState(sub.status);
  const [reason, setReason] = useState('');

  const handleSave = async () => {
    if (!reason.trim()) { toast({ title: 'Veuillez indiquer la raison', variant: 'destructive' }); return; }
    setSaving(true);
    const changes: Record<string, any> = {};
    if (endDate !== sub.end_date) changes.end_date = endDate;
    if (parseFloat(amountMad) !== sub.amount_mad) changes.amount_mad = parseFloat(amountMad);
    if (status !== sub.status) changes.status = status;

    if (Object.keys(changes).length === 0) { toast({ title: 'Aucune modification' }); setSaving(false); return; }

    const { error } = await api.put(`/subscriptions/${sub.id}`, { ...changes, reason });
    if (error) { toast({ title: 'Erreur', description: error, variant: 'destructive' }); }
    else { toast({ title: 'Abonnement modifié' }); setOpen(false); setReason(''); onSuccess?.(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="gap-1"><Pencil className="w-3 h-3" />Modifier</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" />Modifier — {sub.member_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div><Label className="text-sm">Plan actuel</Label><p className="text-sm font-medium mt-1">{PLANS[sub.plan]?.label || sub.plan}</p></div>
          <div><Label className="text-sm">Statut</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="pending">En Attente</SelectItem><SelectItem value="expired">Expiré</SelectItem></SelectContent></Select></div>
          <div><Label className="text-sm">Date de fin</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-sm">Montant (MAD)</Label><Input type="number" min="0" value={amountMad} onChange={e => setAmountMad(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-sm">Raison *</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-1" placeholder="Ex: Extension accordée" rows={2} /></div>
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
