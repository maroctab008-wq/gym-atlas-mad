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
  subscriptionStatus: string;
  amountMad: number;
  paidMad: number;
  onSuccess?: () => void;
}

export default function DeleteSubscriptionButton({ subscriptionId, subscriptionStatus, amountMad, paidMad, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePendingPayments, setDeletePendingPayments] = useState(true);
  const hasPendingPayments = paidMad < amountMad;
  const canDelete = subscriptionStatus === 'expired';

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

  if (!canDelete) {
    return (
      <div className="relative group">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50" disabled>
          <Trash2 className="w-4 h-4" />
        </Button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-popover text-popover-foreground text-xs px-2 py-1 shadow border z-50">
          Impossible de supprimer un abonnement en cours ou réservé
        </span>
      </div>
    );
  }

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
            Êtes-vous sûr de vouloir supprimer cet abonnement expiré ? Cette action est irréversible.
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
              Supprimer aussi les paiements associés
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
