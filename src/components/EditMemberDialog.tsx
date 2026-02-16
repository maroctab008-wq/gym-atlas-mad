import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MemberData {
  id: string;
  full_name: string;
  phone: string;
  cin: string;
  date_of_birth: string;
}

export default function EditMemberDialog({ member, onSuccess }: { member: MemberData; onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...member });

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.cin || !form.date_of_birth) {
      toast({ title: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const changes: Record<string, any> = {};
    if (form.full_name !== member.full_name) changes.full_name = form.full_name;
    if (form.phone !== member.phone) changes.phone = form.phone;
    if (form.cin !== member.cin) changes.cin = form.cin;
    if (form.date_of_birth !== member.date_of_birth) changes.date_of_birth = form.date_of_birth;

    if (Object.keys(changes).length === 0) {
      toast({ title: 'Aucune modification détectée' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('members').update(changes).eq('id', member.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'member',
          entity_id: member.id,
          details: { name: member.full_name, changes, previous: { full_name: member.full_name, phone: member.phone, cin: member.cin, date_of_birth: member.date_of_birth } },
        });
      }
      toast({ title: 'Membre modifié avec succès' });
      setOpen(false);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm({ ...member }); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="w-3 h-3" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Modifier — {member.full_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Nom Complet</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Téléphone</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">CIN</Label>
            <Input value={form.cin} onChange={e => setForm({ ...form, cin: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Date de Naissance</Label>
            <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="mt-1" />
          </div>
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
