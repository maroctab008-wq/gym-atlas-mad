import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  id: string;
  amount_mad: number;
  method: string;
  date: string;
  cheque_number: string | null;
}

export default function EditPaymentDialog({ payment, onSuccess }: { payment: PaymentData; onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount_mad));
  const [method, setMethod] = useState(payment.method);
  const [chequeNumber, setChequeNumber] = useState(payment.cheque_number || '');

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const changes: Record<string, any> = {};
    if (amountNum !== payment.amount_mad) changes.amount_mad = amountNum;
    if (method !== payment.method) changes.method = method;
    if (method === 'cheque' && chequeNumber !== payment.cheque_number) changes.cheque_number = chequeNumber;

    if (Object.keys(changes).length === 0) {
      toast({ title: 'Aucune modification détectée' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('payments').update(changes).eq('id', payment.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'payment',
          entity_id: payment.id,
          details: { changes, previous: { amount_mad: payment.amount_mad, method: payment.method } },
        });
      }
      toast({ title: 'Paiement modifié' });
      setOpen(false);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setAmount(String(payment.amount_mad)); setMethod(payment.method); setChequeNumber(payment.cheque_number || ''); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier le paiement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Montant (MAD)</Label>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Méthode</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Label className="text-sm">N° Chèque</Label>
              <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="mt-1" />
            </div>
          )}
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
