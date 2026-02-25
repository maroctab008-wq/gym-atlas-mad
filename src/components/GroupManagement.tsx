import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Loader2, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, type Permissions } from '@/hooks/usePermissions';

interface GroupRow {
  id: string;
  name: string;
  permissions: Permissions;
  created_at: string;
}

const defaultPerms: Permissions = {
  view_dashboard_kpis: false,
  members_add: false,
  members_edit: false,
  members_delete: false,
  payments_view: false,
  payments_create: false,
  payments_delete: false,
  expenses_view: false,
  expenses_import: false,
  access_override: false,
  settings_access: false,
};

export default function GroupManagement() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<Permissions>({ ...defaultPerms });

  const fetchGroups = async () => {
    const { data } = await api.get('/users/groups');
    if (data) setGroups(data.map((g: any) => ({ ...g, permissions: g.permissions as Permissions })));
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const openCreate = () => {
    setEditingGroup(null);
    setName('');
    setPerms({ ...defaultPerms });
    setDialogOpen(true);
  };

  const openEdit = (group: GroupRow) => {
    setEditingGroup(group);
    setName(group.name);
    setPerms({ ...defaultPerms, ...group.permissions });
    setDialogOpen(true);
  };

  const togglePerm = (key: keyof Permissions) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    if (editingGroup) {
      const { error } = await api.put(`/users/groups/${editingGroup.id}`, { name: name.trim(), permissions: perms });
      if (error) {
        toast({ title: 'Erreur', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Groupe modifié' });
        setDialogOpen(false);
        fetchGroups();
      }
    } else {
      const { error } = await api.post('/users/groups', { name: name.trim(), permissions: perms });
      if (error) {
        toast({ title: 'Erreur', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Groupe créé' });
        setDialogOpen(false);
        fetchGroups();
      }
    }
    setSaving(false);
  };

  const countPerms = (p: Permissions) => Object.values(p).filter(Boolean).length;

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Groupes & Permissions</h2>
          <p className="text-sm text-muted-foreground">Définir les rôles et leur matrice de permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Nouveau Groupe</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Modifier le Groupe' : 'Créer un Groupe'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <Label className="text-sm">Nom du Groupe</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Ex: Superviseur" />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Matrice de Permissions</Label>
                {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
                    <div className="space-y-1.5 pl-1">
                      {keys.map(key => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={perms[key]}
                            onCheckedChange={() => togglePerm(key)}
                          />
                          <span className="text-sm">{PERMISSION_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingGroup ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Nom</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Permissions</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {group.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {countPerms(group.permissions)}/{Object.keys(defaultPerms).length} actives
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEdit(group)}>
                      <Pencil className="w-3.5 h-3.5" />Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
