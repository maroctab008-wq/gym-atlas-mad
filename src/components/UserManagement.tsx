import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, KeyRound, UserCheck, UserX, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import NewUserDialog from '@/components/NewUserDialog';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

interface GroupOption { id: string; name: string; }

interface UserRow {
  user_id: string;
  role: string;
  group_id: string | null;
  full_name: string;
  email: string;
  status: string;
  group_name: string | null;
}

export default function UserManagement() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const isAdmin = role === 'admin';

  const fetchData = async () => {
    const [usersRes, groupsRes] = await Promise.all([
      api.get('/users'),
      api.get('/users/groups'),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleGroupChange = async (userId: string, groupId: string) => {
    setActionLoading(userId);
    const { error } = await api.put(`/users/${userId}/group`, { groupId });

    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Groupe mis à jour' });
      fetchData();
    }
    setActionLoading(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setActionLoading(userId);
    const { error } = await api.put(`/users/${userId}/status`, { status: newStatus });

    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: `Utilisateur ${newStatus === 'active' ? 'activé' : 'désactivé'}` });
      fetchData();
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    const { error } = await api.delete(`/users/${userId}`);
    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Utilisateur supprimé', description: `${userName} a été supprimé` });
      fetchData();
    }
    setActionLoading(null);
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Utilisateurs</h2>
          <p className="text-sm text-muted-foreground">Gérer le personnel et assigner des groupes</p>
        </div>
        <NewUserDialog onSuccess={fetchData} />
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
                  const status = u.status || 'active';
                  const isLoading = actionLoading === u.user_id;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email || '—'}</TableCell>
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
                            {isAdmin && u.full_name && (
                            <>
                              <Button
                                variant="ghost" size="sm" className="gap-1 text-xs h-7"
                                onClick={() => setPasswordDialog({ open: true, userId: u.user_id, userName: u.full_name })}
                                disabled={isLoading}
                              >
                                <KeyRound className="w-3 h-3" />MDP
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive hover:text-destructive" disabled={isLoading}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer <strong>{u.full_name}</strong> ? Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteUser(u.user_id, u.full_name)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
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

      <ChangePasswordDialog
        open={passwordDialog.open}
        onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}
        userId={passwordDialog.userId}
        userName={passwordDialog.userName}
      />
    </div>
  );
}
