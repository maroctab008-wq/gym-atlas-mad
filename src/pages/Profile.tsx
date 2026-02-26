import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Loader2, Save, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, role, profile } = useAuth();
  const { groupName } = usePermissions();
  const { toast } = useToast();

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const startEditing = () => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est obligatoire', variant: 'destructive' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Erreur', description: 'Email invalide', variant: 'destructive' });
      return;
    }

    setSavingProfile(true);

    // Update name in profiles table
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('user_id', user!.id);

    if (profileErr) {
      toast({ title: 'Erreur', description: profileErr.message, variant: 'destructive' });
      setSavingProfile(false);
      return;
    }

    // Update email via auth if changed
    if (email.trim() !== user?.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailErr) {
        toast({ title: 'Erreur', description: emailErr.message, variant: 'destructive' });
        setSavingProfile(false);
        return;
      }
      toast({ title: 'Profil mis à jour', description: 'Un email de confirmation a été envoyé à votre nouvelle adresse' });
    } else {
      toast({ title: 'Profil mis à jour' });
    }

    // Update user_metadata
    await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });

    setSavingProfile(false);
    setEditingProfile(false);

    // Reload to reflect changes
    setTimeout(() => window.location.reload(), 500);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mot de passe mis à jour avec succès' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mon Profil</h1>
        <p className="text-muted-foreground text-sm mt-1">Informations et sécurité du compte</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        {/* Profile Info Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />Informations
              </CardTitle>
              {!editingProfile && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={startEditing}>
                  <Pencil className="w-3 h-3" />Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingProfile ? (
              <>
                <div>
                  <Label className="text-sm">Nom complet</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" placeholder="Votre nom" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="email@exemple.com" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rôle</Label>
                  <div className="mt-1">
                    <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                      {role === 'admin' ? 'Administrateur' : 'Staff'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Groupe</Label>
                  <p className="text-sm font-medium">{groupName || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2 flex-1">
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </Button>
                  <Button variant="outline" onClick={() => setEditingProfile(false)} disabled={savingProfile}>
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{user?.email || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rôle</Label>
                  <div className="mt-1">
                    <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                      {role === 'admin' ? 'Administrateur' : 'Staff'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Groupe</Label>
                  <p className="text-sm font-medium">{groupName || '—'}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <div>
              <Label className="text-sm">Confirmer</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full gap-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Mettre à jour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
