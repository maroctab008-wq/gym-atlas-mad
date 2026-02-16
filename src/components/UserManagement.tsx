import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, KeyRound, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface GroupOption { id: string; name: string; }

interface UserRow {
  user_id: string;
  role: string;
  group_id: string | null;
  profile: { full_name: string; email: string; status: string } | null;
  group: { name: string } | null;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    const [rolesRes, groupsRes] = await Promise.all([
      supabase.from('user_roles').select('user_id, role, group_id, permission_groups(name)'),
      supabase.from('permission_groups').select('id, name').order('name'),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data);

    if (rolesRes.data) {
      // Fetch profiles for each user
      const userIds = rolesRes.data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, status')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setUsers(rolesRes.data.map(r => ({
        user_id: r.user_id,
        role: r.role,
        group_id: r.group_id,
        profile: profileMap.get(r.user_id) || null,
        group: r.permission_groups as any,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleGroupChange = async (userId: string, groupId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('user_roles')
      .update({ group_id: groupId })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'update', entity_type: 'user_role',
          entity_id: userId, details: { new_group_id: groupId },
        });
      }
      toast({ title: 'Groupe mis à jour' });
      fetchData();
    }
    setActionLoading(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setActionLoading(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'update', entity_type: 'user_status',
          entity_id: userId, details: { new_status: newStatus },
        });
      }
      toast({ title: `Utilisateur ${newStatus === 'active' ? 'activé' : 'désactivé'}` });
      fetchData();
    }
    setActionLoading(null);
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setActionLoading(userId);
    // Use edge function or admin API for password reset
    // For now, send a password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'password_reset', entity_type: 'user',
          entity_id: userId, details: { email },
        });
      }
      toast({ title: 'Email de réinitialisation envoyé', description: `Un lien a été envoyé à ${email}` });
    }
    setActionLoading(null);
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Utilisateurs</h2>
        <p className="text-sm text-muted-foreground">Gérer le personnel et assigner des groupes</p>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Nom</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Email</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Groupe</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Statut</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
              ) : (
                users.map(u => {
                  const status = u.profile?.status || 'active';
                  const isLoading = actionLoading === u.user_id;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.profile?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.profile?.email || '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={u.group_id || ''}
                          onValueChange={(v) => handleGroupChange(u.user_id, v)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue placeholder="Aucun groupe" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status === 'active' ? 'default' : 'outline'}
                          className={status === 'active'
                            ? 'bg-success/10 text-success border-success/30'
                            : 'text-muted-foreground'}
                        >
                          {status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="sm" className="gap-1 text-xs h-7"
                            onClick={() => handleToggleStatus(u.user_id, status)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                              status === 'active'
                                ? <><UserX className="w-3 h-3" />Désactiver</>
                                : <><UserCheck className="w-3 h-3" />Activer</>
                            )}
                          </Button>
                          {u.profile?.email && (
                            <Button
                              variant="ghost" size="sm" className="gap-1 text-xs h-7"
                              onClick={() => handleResetPassword(u.user_id, u.profile!.email)}
                              disabled={isLoading}
                            >
                              <KeyRound className="w-3 h-3" />Reset MDP
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
