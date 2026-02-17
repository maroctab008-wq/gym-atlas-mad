import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, FileUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ParsedMember {
  full_name: string;
  phone: string;
  cin: string;
  date_of_birth: string;
}

export default function ImportXMLButton({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedMember[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');

        const errorNode = doc.querySelector('parsererror');
        if (errorNode) {
          toast({ title: 'Erreur', description: 'Fichier XML invalide', variant: 'destructive' });
          return;
        }

        const members: ParsedMember[] = [];
        const memberNodes = doc.querySelectorAll('Member, member, Membre, membre');

        memberNodes.forEach((node) => {
          const getText = (tags: string[]): string => {
            for (const tag of tags) {
              const el = node.querySelector(tag);
              if (el?.textContent?.trim()) return el.textContent.trim();
            }
            return '';
          };

          const fullName = getText(['full_name', 'FullName', 'Nom', 'nom', 'name', 'Name',
            'NomComplet', 'nom_complet']) ||
            [getText(['Prenom', 'prenom', 'FirstName', 'first_name']),
             getText(['Nom', 'nom', 'LastName', 'last_name'])].filter(Boolean).join(' ');

          const phone = getText(['phone', 'Phone', 'Telephone', 'telephone', 'tel', 'Tel', 'mobile', 'Mobile']);
          const cin = getText(['cin', 'CIN', 'Badge', 'badge', 'qr_code', 'QRCode', 'barcode', 'Barcode', 'code']);
          const dob = getText(['date_of_birth', 'DateOfBirth', 'DateNaissance', 'date_naissance', 'dob', 'DOB', 'birthday']);

          if (fullName) {
            members.push({
              full_name: fullName,
              phone: phone || '0000000000',
              cin: cin || `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
              date_of_birth: dob || '2000-01-01',
            });
          }
        });

        if (members.length === 0) {
          toast({ title: 'Aucun membre trouvé', description: 'Vérifiez la structure du fichier XML.', variant: 'destructive' });
          return;
        }

        setParsed(members);
        setDialogOpen(true);
      } catch {
        toast({ title: 'Erreur', description: 'Impossible de lire le fichier', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    const rows = parsed.map(m => ({
      full_name: m.full_name,
      phone: m.phone,
      cin: m.cin,
      date_of_birth: m.date_of_birth,
      qr_code: `QR-${m.cin.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    }));

    const { error } = await supabase.from('members').insert(rows);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'import', entity_type: 'member',
          details: { count: rows.length, source: 'xml' },
        });
      }
      toast({ title: `${rows.length} membres importés avec succès` });
      setDialogOpen(false);
      setParsed([]);
      onSuccess();
    }
    setImporting(false);
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={handleFileSelect} />
      <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
        <Upload className="w-4 h-4" />Importer XML
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />Aperçu de l'importation ({parsed.length} membres)
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nom</TableHead>
                <TableHead className="text-xs">Téléphone</TableHead>
                <TableHead className="text-xs">CIN/Badge</TableHead>
                <TableHead className="text-xs">Date de Naissance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.slice(0, 50).map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{m.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.phone}</TableCell>
                  <TableCell className="text-sm font-mono">{m.cin}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.date_of_birth}</TableCell>
                </TableRow>
              ))}
              {parsed.length > 50 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                    ... et {parsed.length - 50} autres membres
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importer {parsed.length} membres
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
