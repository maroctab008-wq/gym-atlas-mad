import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface GroupOption { id: string; name: string; }

export default function NewUserDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'staff' as 'admin' | 'staff', groupId: '' });

  useEffect(() => {
    if (open) {
      api.get('/users/groups').then(({ data }) => {
        if (data) setGroups(data);
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.password) {
      toast({ title: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Le mot de passe doit contenir au moins 6 caractères', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await api.post('/users', {
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role,
      groupId: form.groupId || null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Utilisateur créé avec succès' });
      setOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'staff', groupId: '' });
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="w-4 h-4" />Nouvel Utilisateur</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Créer un Utilisateur</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm">Nom complet *</Label>
            <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="mt-1" placeholder="Ex: Ahmed Benali" />
          </div>
          <div>
            <Label className="text-sm">Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" placeholder="Ex: staff@gym.com" />
          </div>
          <div>
            <Label className="text-sm">Mot de passe *</Label>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1" placeholder="Min. 6 caractères" />
          </div>
          <div>
            <Label className="text-sm">Rôle</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as 'admin' | 'staff' })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Groupe de permissions</Label>
            <Select value={form.groupId} onValueChange={v => setForm({ ...form, groupId: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Aucun groupe" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Créer l'utilisateur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
