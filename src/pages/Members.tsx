import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Search, QrCode, Phone, CreditCard as CINIcon } from 'lucide-react';
import { mockMembers } from '@/data/mockData';
import { formatDateFR, generateQRCode } from '@/lib/formatters';
import { Member } from '@/types/gym';

export default function Members() {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', cin: '' });

  const filtered = members.filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.cin.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  const handleAdd = () => {
    if (!form.fullName || !form.phone || !form.cin) return;
    const newMember: Member = {
      id: `m${Date.now()}`,
      fullName: form.fullName,
      phone: form.phone,
      cin: form.cin,
      qrCode: generateQRCode(form.cin),
      joinDate: new Date().toISOString().split('T')[0],
    };
    setMembers([newMember, ...members]);
    setForm({ fullName: '', phone: '', cin: '' });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Membres</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} membres enregistrés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Nouveau membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un membre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm">Nom Complet</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: Ahmed Benali"
                />
              </div>
              <div>
                <Label className="text-sm">Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: 0661234567"
                />
              </div>
              <div>
                <Label className="text-sm">CIN</Label>
                <Input
                  value={form.cin}
                  onChange={(e) => setForm({ ...form, cin: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: AB123456"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          placeholder="Rechercher par nom, CIN ou téléphone..."
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Nom</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Téléphone</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">CIN</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">QR Code</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide">Inscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.fullName}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {member.phone}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-mono text-sm">
                      <CINIcon className="w-3 h-3 text-muted-foreground" />
                      {member.cin}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs gap-1">
                      <QrCode className="w-3 h-3" />
                      {member.qrCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateFR(member.joinDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
