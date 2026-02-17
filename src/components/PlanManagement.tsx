import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatMAD } from '@/lib/formatters';

interface PlanRow {
  id: string;
  label: string;
  months: number;
  price_mad: number;
  is_active: boolean;
}

export default function PlanManagement({ onPlansChanged }: { onPlansChanged?: () => void }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', months: '', price_mad: '' });

  const fetchPlans = async () => {
    const { data } = await supabase.from('plan_configs').select('*').order('months');
    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async () => {
    if (!form.label || !form.months || !form.price_mad) {
      toast({ title: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { label: form.label, months: parseInt(form.months), price_mad: parseFloat(form.price_mad), is_active: true };

    if (editingId) {
      const { error } = await supabase.from('plan_configs').update(payload).eq('id', editingId);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Plan modifié' });
    } else {
      const { error } = await supabase.from('plan_configs').insert(payload);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Plan créé' });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm({ label: '', months: '', price_mad: '' });
    fetchPlans();
    onPlansChanged?.();
  };

  const toggleActive = async (plan: PlanRow) => {
    await supabase.from('plan_configs').update({ is_active: !plan.is_active }).eq('id', plan.id);
    fetchPlans();
    onPlansChanged?.();
  };

  const openEdit = (plan: PlanRow) => {
    setEditingId(plan.id);
    setForm({ label: plan.label, months: String(plan.months), price_mad: String(plan.price_mad) });
    setDialogOpen(true);
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mt-8" />;

  return (
    <Card className="shadow-sm max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Gestion des Plans
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm({ label: '', months: '', price_mad: '' }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3.5 h-3.5" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Modifier le plan' : 'Nouveau plan'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-sm">Nom du plan</Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="mt-1" placeholder="Ex: Semestriel" />
              </div>
              <div>
                <Label className="text-sm">Durée (mois)</Label>
                <Input type="number" min="1" value={form.months} onChange={e => setForm({ ...form, months: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Prix (MAD)</Label>
                <Input type="number" min="0" value={form.price_mad} onChange={e => setForm({ ...form, price_mad: e.target.value })} className="mt-1" />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase">Plan</TableHead>
              <TableHead className="text-xs uppercase">Durée</TableHead>
              <TableHead className="text-xs uppercase">Prix</TableHead>
              <TableHead className="text-xs uppercase">Statut</TableHead>
              <TableHead className="text-xs uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map(plan => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.label}</TableCell>
                <TableCell>{plan.months} mois</TableCell>
                <TableCell className="font-mono">{formatMAD(plan.price_mad)}</TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(plan)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
