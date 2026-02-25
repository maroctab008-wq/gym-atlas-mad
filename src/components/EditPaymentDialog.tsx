import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatMAD } from '@/lib/formatters';

interface PaymentData {
  id: string;
  amount_mad: number;
  method: string;
  date: string;
  cheque_number: string | null;
  subscription_id: string | null;
}

interface SubInfo {
  id: string;
  amount_mad: number;
  paid_mad: number;
  status: string;
}

export default function EditPaymentDialog({ payment, onSuccess }: { payment: PaymentData; onSuccess?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [method, setMethod] = useState(payment.method);
  const [chequeNumber, setChequeNumber] = useState(payment.cheque_number || '');
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdditionalAmount('');
    setMethod(payment.method);
    setChequeNumber(payment.cheque_number || '');
    if (payment.subscription_id) {
      api.get(`/subscriptions/${payment.subscription_id}`).then(({ data }) => {
        if (data) setSubInfo(data);
      });
    } else {
      setSubInfo(null);
    }
  }, [open, payment]);

  const totalDue = subInfo?.amount_mad ?? 0;
  const alreadyPaid = subInfo?.paid_mad ?? 0;
  const currentRemaining = totalDue - alreadyPaid;
  const addNum = parseFloat(additionalAmount) || 0;
  const newRemaining = Math.max(0, currentRemaining - addNum);

  const handleSave = async () => {
    if (addNum <= 0 && method === payment.method) {
      toast({ title: 'Aucune modification détectée' });
      return;
    }
    if (addNum < 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const changes: Record<string, any> = {};
    if (method !== payment.method) changes.method = method;
    if (method === 'cheque' && chequeNumber !== payment.cheque_number) changes.cheque_number = chequeNumber;

    if (addNum > 0) {
      changes.amount_mad = payment.amount_mad + addNum;
      changes.amount_due = newRemaining;
    }

    if (Object.keys(changes).length === 0) {
      toast({ title: 'Aucune modification détectée' });
      setSaving(false);
      return;
    }

    const { error } = await api.put(`/payments/${payment.id}`, changes);
    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({
      title: 'Paiement mis à jour avec succès',
      description: 'La facture est disponible au téléchargement.',
    });
    setOpen(false);
    onSuccess?.();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          {subInfo && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix total abonnement</span>
                <span className="font-semibold">{formatMAD(totalDue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Déjà payé</span>
                <span className="font-semibold">{formatMAD(alreadyPaid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground font-medium">Reste à payer</span>
                <span className={`font-bold ${currentRemaining > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatMAD(currentRemaining)}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm">Versement complémentaire (MAD)</Label>
            <Input
              type="number"
              min="0"
              max={currentRemaining > 0 ? currentRemaining : undefined}
              value={additionalAmount}
              onChange={e => setAdditionalAmount(e.target.value)}
              className="mt-1"
              placeholder={currentRemaining > 0 ? `Max: ${currentRemaining}` : '0'}
            />
          </div>

          {addNum > 0 && subInfo && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nouveau reste à payer</span>
                <span className={`font-bold ${newRemaining > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatMAD(newRemaining)}
                </span>
              </div>
              {newRemaining === 0 && (
                <p className="text-xs text-success mt-1">✓ Le statut passera à « Complet »</p>
              )}
            </div>
          )}

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
