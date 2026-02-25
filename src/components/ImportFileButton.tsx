import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Upload, Loader2, FileUp, ChevronDown, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ParsedMember {
  full_name: string;
  phone: string;
  cin: string;
  date_of_birth: string;
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  full_name: ['full_name', 'fullname', 'nom complet', 'nom_complet', 'name', 'nom', 'membre', 'prenom+nom'],
  first_name: ['prenom', 'prénom', 'first_name', 'firstname'],
  last_name: ['nom', 'last_name', 'lastname', 'nom_famille'],
  phone: ['phone', 'telephone', 'téléphone', 'tel', 'mobile', 'gsm'],
  cin: ['cin', 'badge', 'qr_code', 'barcode', 'code', 'identifiant'],
  date_of_birth: ['date_of_birth', 'date_naissance', 'date de naissance', 'dob', 'birthday', 'naissance'],
};

function findColumn(headers: string[], mapping: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_àéèêëïîôùûüç ]/gi, ''));
  for (const m of mapping) {
    const idx = normalized.indexOf(m.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseRows(headers: string[], rows: string[][]): ParsedMember[] {
  const fullNameIdx = findColumn(headers, COLUMN_MAPPINGS.full_name);
  const firstNameIdx = findColumn(headers, COLUMN_MAPPINGS.first_name);
  const lastNameIdx = findColumn(headers, COLUMN_MAPPINGS.last_name);
  const phoneIdx = findColumn(headers, COLUMN_MAPPINGS.phone);
  const cinIdx = findColumn(headers, COLUMN_MAPPINGS.cin);
  const dobIdx = findColumn(headers, COLUMN_MAPPINGS.date_of_birth);

  const members: ParsedMember[] = [];

  for (const row of rows) {
    if (row.every(c => !c?.trim())) continue;

    let name = '';
    if (fullNameIdx !== -1 && row[fullNameIdx]?.trim()) {
      name = row[fullNameIdx].trim();
    } else {
      const first = firstNameIdx !== -1 ? row[firstNameIdx]?.trim() || '' : '';
      const last = lastNameIdx !== -1 ? row[lastNameIdx]?.trim() || '' : '';
      name = [first, last].filter(Boolean).join(' ');
    }

    if (!name) continue;

    members.push({
      full_name: name,
      phone: (phoneIdx !== -1 ? row[phoneIdx]?.trim() : '') || '0000000000',
      cin: (cinIdx !== -1 ? row[cinIdx]?.trim() : '') || `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      date_of_birth: (dobIdx !== -1 ? row[dobIdx]?.trim() : '') || '2000-01-01',
    });
  }

  return members;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
  return { headers, rows };
}

function parseExcel(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (data.length < 2) return { headers: [], rows: [] };
  return { headers: data[0].map(String), rows: data.slice(1).map(r => r.map(String)) };
}

function parseXML(text: string): ParsedMember[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return [];

  const members: ParsedMember[] = [];
  const nodes = doc.querySelectorAll('Member, member, Membre, membre');

  nodes.forEach((node) => {
    const getText = (tags: string[]): string => {
      for (const tag of tags) {
        const el = node.querySelector(tag);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return '';
    };

    const fullName = getText(['full_name', 'FullName', 'Nom', 'nom', 'name', 'Name', 'NomComplet', 'nom_complet']) ||
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

  return members;
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Nom Complet', 'Téléphone', 'CIN', 'Date de Naissance'],
    ['Ahmed Benali', '0661234567', 'AB123456', '1995-03-15'],
    ['Fatima Zahra', '0712345678', 'CD789012', '2000-07-22'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Membres');
  XLSX.writeFile(wb, 'modele-import-membres.xlsx');
}

export default function ImportFileButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedMember[]>([]);
  const [importing, setImporting] = useState(false);
  const [acceptType, setAcceptType] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let members: ParsedMember[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        const { headers, rows } = parseCSV(text);
        members = parseRows(headers, rows);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const { headers, rows } = parseExcel(buffer);
        members = parseRows(headers, rows);
      } else if (ext === 'xml') {
        const text = await file.text();
        members = parseXML(text);
      } else {
        toast({ title: 'Format non supporté', description: 'Utilisez CSV, Excel (.xlsx/.xls) ou XML.', variant: 'destructive' });
        return;
      }

      if (members.length === 0) {
        toast({ title: 'Aucun membre trouvé', description: 'Vérifiez la structure du fichier.', variant: 'destructive' });
        return;
      }

      setParsed(members);
      setDialogOpen(true);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de lire le fichier', variant: 'destructive' });
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const openFilePicker = (accept: string) => {
    setAcceptType(accept);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const handleImport = async () => {
    setImporting(true);
    const rows = parsed.map(m => ({
      full_name: m.full_name,
      phone: m.phone,
      cin: m.cin,
      date_of_birth: m.date_of_birth,
    }));

    const { error } = await api.post('/members/import', { members: rows });

    if (error) {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
    } else {
      toast({ title: `${rows.length} membres importés avec succès` });
      setDialogOpen(false);
      setParsed([]);
      onSuccess();
    }
    setImporting(false);
  };

  return (
    <>
      <input ref={fileRef} type="file" accept={acceptType} className="hidden" onChange={handleFileSelect} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />Importer Fichier<ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openFilePicker('.csv')} className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4" />Importer CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openFilePicker('.xlsx,.xls')} className="gap-2 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />Importer Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openFilePicker('.xml')} className="gap-2 cursor-pointer">
            <FileUp className="w-4 h-4" />Importer XML
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={downloadTemplate} className="gap-2 cursor-pointer">
            <Download className="w-4 h-4" />Télécharger le modèle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
