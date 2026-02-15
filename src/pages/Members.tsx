import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <h1 className="text-2xl font-display font-bold tracking-wider text-neon-cyan">MEMBRES</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} membres enregistrés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-display tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/80 neon-glow">
              <UserPlus className="w-4 h-4" />
              NOUVEAU MEMBRE
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-primary/30 neon-glow">
            <DialogHeader>
              <DialogTitle className="font-display tracking-wider text-primary">AJOUTER UN MEMBRE</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nom Complet</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1 bg-secondary border-border focus:border-primary"
                  placeholder="Ex: Ahmed Benali"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 bg-secondary border-border focus:border-primary"
                  placeholder="Ex: 0661234567"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">CIN</Label>
                <Input
                  value={form.cin}
                  onChange={(e) => setForm({ ...form, cin: e.target.value })}
                  className="mt-1 bg-secondary border-border focus:border-primary"
                  placeholder="Ex: AB123456"
                />
              </div>
              <Button onClick={handleAdd} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/80">
                ENREGISTRER
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
          className="pl-10 bg-secondary border-border focus:border-primary"
          placeholder="Rechercher par nom, CIN ou téléphone..."
        />
      </div>

      {/* Table */}
      <Card className="glass-panel border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-display text-xs tracking-wider text-primary">NOM</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">TÉLÉPHONE</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">CIN</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">QR CODE</TableHead>
                <TableHead className="font-display text-xs tracking-wider text-primary">INSCRIPTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id} className="border-border/30 hover:bg-primary/5">
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
                    <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs gap-1">
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
