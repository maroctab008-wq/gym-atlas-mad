import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props { subscriptionId: string; subscriptionStatus: string; amountMad: number; paidMad: number; onSuccess?: () => void; }

export default function DeleteSubscriptionButton({ subscriptionId, subscriptionStatus, amountMad, paidMad, onSuccess }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePendingPayments, setDeletePendingPayments] = useState(true);
  const hasPendingPayments = paidMad < amountMad;
  const canDelete = subscriptionStatus === 'expired';

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await api.delete(`/subscriptions/${subscriptionId}?deletePayments=${deletePendingPayments}`);
    if (error) {
      toast({ title: 'Erreur de suppression', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Élément supprimé avec succès' });
      onSuccess?.();
    }
    setDeleting(false);
    setOpen(false);
  };

  if (!canDelete) {
    return (
      <div className="relative group">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50" disabled><Trash2 className="w-4 h-4" /></Button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-popover text-popover-foreground text-xs px-2 py-1 shadow border z-50">Impossible de supprimer un abonnement en cours ou réservé</span>
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cet abonnement expiré ?</AlertDialogDescription></AlertDialogHeader>
        {hasPendingPayments && (
          <div className="flex items-center space-x-2 py-2"><Checkbox id="delete-payments" checked={deletePendingPayments} onCheckedChange={(v) => setDeletePendingPayments(!!v)} /><Label htmlFor="delete-payments" className="text-sm">Supprimer aussi les paiements associés</Label></div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
