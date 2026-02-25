import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function MaintenanceSection() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [membersRes, subscriptionsRes, paymentsRes, plansRes, settingsRes, expensesRes] = await Promise.all([
        api.get('/members'),
        api.get('/subscriptions'),
        api.get('/payments'),
        api.get('/plans'),
        api.get('/settings'),
        api.get('/expenses'),
      ]);

      const wb = XLSX.utils.book_new();

      const membersData = (membersRes.data || []).map((m: any) => ({
        'Nom complet': m.full_name,
        'Téléphone': m.phone,
        'CIN': m.cin,
        'Date de naissance': m.date_of_birth,
        'Date d\'inscription': m.join_date,
        'QR Code': m.qr_code,
        'Créé le': m.created_at,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(membersData), 'Membres');

      const subsData = (subscriptionsRes.data || []).map((s: any) => ({
        'Membre': s.member_name,
        'Plan': s.plan,
        'Début': s.start_date,
        'Fin': s.end_date,
        'Montant (MAD)': s.amount_mad,
        'Payé (MAD)': s.paid_mad,
        'Statut': s.status,
        'Créé le': s.created_at,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subsData), 'Abonnements');

      const paymentsData = (paymentsRes.data || []).map((p: any) => ({
        'Membre': p.member_name,
        'N° Facture': p.invoice_number,
        'Montant (MAD)': p.amount_mad,
        'Reste (MAD)': p.amount_due,
        'Méthode': p.method,
        'Date': p.date,
        'N° Chèque': p.cheque_number || '',
        'Créé le': p.created_at,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), 'Paiements');

      const plansData = (plansRes.data || []).map((p: any) => ({
        'Label': p.label,
        'Mois': p.months,
        'Prix (MAD)': p.price_mad,
        'Actif': p.is_active ? 'Oui' : 'Non',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plansData), 'Plans');

      const expensesData = (expensesRes.data || []).map((e: any) => ({
        'Catégorie': e.category,
        'Description': e.description || '',
        'Montant (MAD)': e.amount_mad,
        'Date': e.date,
        'Créé le': e.created_at,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), 'Dépenses');

      const settingsData = (settingsRes.data || []).map((s: any) => ({
        'Clé': s.key,
        'Valeur': typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value),
        'Mis à jour le': s.updated_at,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsData), 'Paramètres');

      XLSX.writeFile(wb, `gymmanager-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: 'Export terminé', description: 'Le fichier Excel a été téléchargé.' });
    } catch {
      toast({ title: 'Erreur', description: "Échec de l'export", variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleResetDatabase = async () => {
    if (!password || !profile?.email) return;
    setResetting(true);
    try {
      const { data, error } = await api.post('/settings/reset-database', { email: profile.email, password });
      if (error) throw new Error(error);
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Base réinitialisée', description: 'Toutes les données ont été supprimées.' });
      setResetDialogOpen(false);
      setPassword('');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de la réinitialisation', variant: 'destructive' });
    }
    setResetting(false);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />Export des Données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Téléchargez toutes les données (Membres, Abonnements, Paiements, Config) au format Excel.
          </p>
          <Button onClick={handleExportExcel} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exporter en Excel
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />Zone Dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Supprime toutes les données (Membres, Abonnements, Paiements, Dépenses, Logs). Cette action est irréversible.
          </p>
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} className="gap-2">
            <Trash2 className="w-4 h-4" />Réinitialiser la Base
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />Réinitialiser la Base de Données
            </DialogTitle>
            <DialogDescription>
              Cette action supprimera définitivement toutes les données. Entrez votre mot de passe administrateur pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label className="text-sm">Mot de passe administrateur</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetDialogOpen(false); setPassword(''); }}>Annuler</Button>
            <Button variant="destructive" onClick={handleResetDatabase} disabled={resetting || !password} className="gap-2">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Confirmer la Réinitialisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
