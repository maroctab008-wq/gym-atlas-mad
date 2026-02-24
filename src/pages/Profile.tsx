import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, role, profile } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await api.put('/auth/change-password', { newPassword });
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Mot de passe mis à jour avec succès' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-foreground">Mon Profil</h1><p className="text-muted-foreground text-sm mt-1">Informations et sécurité du compte</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
            <div><Label className="text-xs text-muted-foreground">Nom</Label><p className="text-sm font-medium">{profile?.full_name || '—'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Rôle</Label><div className="mt-1"><Badge variant={role === 'admin' ? 'default' : 'secondary'}>{role === 'admin' ? 'Administrateur' : 'Staff'}</Badge></div></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" />Changer le mot de passe</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-sm">Nouveau mot de passe</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" placeholder="••••••••" /></div>
            <div><Label className="text-sm">Confirmer</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" placeholder="••••••••" /></div>
            <Button onClick={handleChangePassword} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Mettre à jour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
