import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Loyer' },
  { value: 'electricity', label: 'Électricité' },
  { value: 'salaries', label: 'Salaires' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'equipment', label: 'Équipement' },
  { value: 'other', label: 'Autre' },
];

export default function ExpenseDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = async () => {
    if (!category || !amount || !date) {
      toast({ title: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      category,
      description: description || null,
      amount_mad: amountNum,
      date,
      created_by: user?.id || null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'create',
          entity_type: 'expense',
          details: { category, amount: amountNum, description },
        });
      }
      toast({ title: 'Dépense enregistrée' });
      setOpen(false);
      setCategory('');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Receipt className="w-4 h-4" />
          Nouvelle Dépense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Nouvelle Dépense
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" placeholder="Ex: Facture électricité janvier" />
          </div>
          <div>
            <Label className="text-sm">Montant (MAD) *</Label>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" placeholder="Ex: 5000" />
          </div>
          <div>
            <Label className="text-sm">Date *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
