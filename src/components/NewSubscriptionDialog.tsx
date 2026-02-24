import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { usePlans } from '@/hooks/usePlans';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

interface MemberOption { id: string; full_name: string; }

export default function NewSubscriptionDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { plans } = usePlans();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [duplicateBlocked, setDuplicateBlocked] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/members').then(({ data }) => { if (data) setMembers(data); });
    }
  }, [open]);

  useEffect(() => {
    if (!memberId) { setDuplicateBlocked(false); return; }
    api.get(`/subscriptions/check-duplicate/${memberId}`).then(({ data }) => {
      if (data?.duplicate) {
        setDuplicateBlocked(true);
        toast({ title: 'Doublon détecté', description: 'Ce membre a déjà un abonnement actif/en attente.', variant: 'destructive' });
      } else { setDuplicateBlocked(false); }
    });
  }, [memberId]);

  useEffect(() => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan && startDate) {
      const end = addMonths(new Date(startDate), selectedPlan.months);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [planId, startDate, plans]);

  const selectedPlan = plans.find(p => p.id === planId);

  const handleSave = async () => {
    if (!memberId || !planId || !startDate || !endDate) { toast({ title: 'Remplissez tous les champs', variant: 'destructive' }); return; }
    setSaving(true);
    const plan = plans.find(p => p.id === planId);
    if (!plan) { setSaving(false); return; }

    const selectedMember = members.find(m => m.id === memberId);
    const { error } = await api.post('/subscriptions', {
      member_id: memberId, member_name: selectedMember?.full_name || null,
      plan: plan.label, start_date: startDate, end_date: endDate,
      amount_mad: plan.price_mad, paid_mad: 0, status,
    });

    if (error) { toast({ title: 'Erreur', description: error, variant: 'destructive' }); }
    else { toast({ title: 'Abonnement créé avec succès' }); setOpen(false); setMemberId(''); setPlanId(''); setStatus('pending'); setDuplicateBlocked(false); onSuccess?.(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Ajouter un abonnement</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvel Abonnement</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div><Label className="text-sm">Membre</Label><Select value={memberId} onValueChange={setMemberId}><SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger><SelectContent>{members.map(m => (<SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>))}</SelectContent></Select>
            {duplicateBlocked && <p className="text-xs text-destructive mt-1 font-medium">⚠ Ce membre possède déjà un abonnement actif ou en attente.</p>}
          </div>
          <div><Label className="text-sm">Plan</Label><Select value={planId} onValueChange={setPlanId} disabled={duplicateBlocked}><SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger><SelectContent>{plans.map(p => (<SelectItem key={p.id} value={p.id}>{p.label} — {p.price_mad} MAD / {p.months} mois</SelectItem>))}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-sm">Début</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" /></div><div><Label className="text-sm">Fin</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" /></div></div>
          <div><Label className="text-sm">Statut</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="expired">Expiré</SelectItem></SelectContent></Select></div>
          {selectedPlan && <div className="p-3 rounded-lg bg-secondary/50 text-sm"><span className="text-muted-foreground">Montant : </span><span className="font-semibold">{selectedPlan.price_mad} MAD</span></div>}
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving || duplicateBlocked}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Créer l'abonnement</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
