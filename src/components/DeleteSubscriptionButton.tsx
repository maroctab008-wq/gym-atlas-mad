import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Props {
  subscriptionId: string;
  amountMad: number;
  paidMad: number;
  onSuccess?: () => void;
}

export default function DeleteSubscriptionButton({ subscriptionId, amountMad, paidMad, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePendingPayments, setDeletePendingPayments] = useState(true);
  const hasPendingPayments = paidMad < amountMad;

  const handleDelete = async () => {
    setDeleting(true);

    // Optionally delete pending payments linked to this subscription
    if (deletePendingPayments) {
      const { error: payError } = await supabase
        .from('payments')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (payError) {
        toast({ title: 'Erreur', description: 'Impossible de supprimer les paiements liés: ' + payError.message, variant: 'destructive' });
        setDeleting(false);
        return;
      }
    }

    const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
    if (error) {
      toast({
        title: 'Erreur de suppression',
        description: error.message.includes('foreign key')
          ? 'Cet abonnement est lié à des paiements. Supprimez-les d\'abord.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'delete', entity_type: 'subscription',
          entity_id: subscriptionId, details: { deleted_payments: deletePendingPayments },
        });
      }
      toast({ title: 'Élément supprimé avec succès' });
      onSuccess?.();
    }
    setDeleting(false);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasPendingPayments && (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="delete-payments"
              checked={deletePendingPayments}
              onCheckedChange={(v) => setDeletePendingPayments(!!v)}
            />
            <Label htmlFor="delete-payments" className="text-sm">
              Supprimer aussi les paiements en attente associés
            </Label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
