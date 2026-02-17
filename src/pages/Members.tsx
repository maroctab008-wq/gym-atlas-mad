import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Search, Barcode, Phone, CreditCard as CINIcon, Loader2 } from 'lucide-react';
import { formatDateFR } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from '@/components/EditMemberDialog';
import DeleteMemberButton from '@/components/DeleteMemberButton';
import ImportFileButton from '@/components/ImportFileButton';


interface MemberRow {
  id: string;
  full_name: string;
  phone: string;
  cin: string;
  qr_code: string;
  date_of_birth: string;
  join_date: string;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function Members() {
  const { role, user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', cin: '', dateOfBirth: '' });

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, full_name, phone, cin, qr_code, date_of_birth, join_date')
      .order('created_at', { ascending: false });
    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.cin.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  const handleAdd = async () => {
    if (!form.fullName || !form.phone || !form.cin || !form.dateOfBirth) return;
    setSaving(true);
    const qrCode = `QR-${form.cin.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from('members').insert({
      full_name: form.fullName, phone: form.phone, cin: form.cin, qr_code: qrCode, date_of_birth: form.dateOfBirth,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({ user_id: user.id, action: 'create', entity_type: 'member', details: { name: form.fullName, cin: form.cin } });
      }
      toast({ title: 'Membre ajouté avec succès' });
      setForm({ fullName: '', phone: '', cin: '', dateOfBirth: '' });
      setDialogOpen(false);
      fetchMembers();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Membres</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} membres enregistrés</p>
        </div>
        <div className="flex gap-2">
          {can('members_add') && <ImportFileButton onSuccess={fetchMembers} />}
          {can('members_add') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" />Nouveau membre</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label className="text-sm">Nom Complet</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" placeholder="Ex: Ahmed Benali" /></div>
                <div><Label className="text-sm">Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="Ex: 0661234567" /></div>
                <div><Label className="text-sm">CIN</Label><Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} className="mt-1" placeholder="Ex: AB123456" /></div>
                <div><Label className="text-sm">Date de Naissance</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1" /></div>
                <Button onClick={handleAdd} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Rechercher par nom, CIN ou téléphone..." />
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Nom</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Téléphone</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">CIN</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Âge</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Code-barres</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Inscription</TableHead>
                {can('members_edit') && <TableHead className="text-xs font-medium uppercase tracking-wide">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={can('members_edit') ? 7 : 6} className="text-center py-8 text-muted-foreground">Aucun membre trouvé</TableCell></TableRow>
              ) : (
                filtered.map((member) => {
                  const age = calculateAge(member.date_of_birth);
                  const isJunior = age < 18;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell><span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" />{member.phone}</span></TableCell>
                      <TableCell><span className="flex items-center gap-1.5 font-mono text-sm"><CINIcon className="w-3 h-3 text-muted-foreground" />{member.cin}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{age} ans</span>
                          <Badge variant={isJunior ? 'outline' : 'secondary'} className={isJunior ? 'border-info/50 text-info text-xs' : 'text-xs'}>
                            {isJunior ? 'Junior' : 'Adulte'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs gap-1"><Barcode className="w-3 h-3" />{member.qr_code}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFR(member.join_date)}</TableCell>
                      {can('members_edit') && (
                        <TableCell>
                          <div className="flex gap-1">
                            <EditMemberDialog member={member} onSuccess={fetchMembers} />
                            <DeleteMemberButton memberId={member.id} memberName={member.full_name} onSuccess={fetchMembers} />
                          </div>
                        </TableCell>
                      )}
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
