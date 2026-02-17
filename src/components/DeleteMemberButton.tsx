import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Props {
  memberId: string;
  memberName: string;
  onSuccess?: () => void;
}

export default function DeleteMemberButton({ memberId, memberName, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    // Check for active subscriptions
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .limit(1);

    if (activeSubs && activeSubs.length > 0) {
      toast({
        title: 'Suppression impossible',
        description: 'Ce membre a des abonnements actifs. Veuillez les résilier avant de supprimer le membre.',
        variant: 'destructive',
      });
      setDeleting(false);
      setOpen(false);
      return;
    }

    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) {
      toast({
        title: 'Erreur de suppression',
        description: error.message.includes('foreign key')
          ? 'Ce membre est lié à d\'autres données. Supprimez d\'abord ses abonnements et paiements.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'delete', entity_type: 'member',
          entity_id: memberId, details: { name: memberName },
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
