import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function MaintenanceSection() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleExportXML = async () => {
    setExporting(true);
    try {
      const [membersRes, subscriptionsRes, paymentsRes, plansRes, settingsRes, expensesRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('plan_configs').select('*'),
        supabase.from('app_settings').select('*'),
        supabase.from('expenses').select('*'),
      ]);

      const escapeXml = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const toXmlRows = (tag: string, rows: any[]) => {
        return rows.map(row => {
          const fields = Object.entries(row).map(([k, v]) => {
            if (typeof v === 'object' && v !== null) return `    <${k}>${escapeXml(JSON.stringify(v))}</${k}>`;
            return `    <${k}>${escapeXml(v)}</${k}>`;
          }).join('\n');
          return `  <${tag}>\n${fields}\n  </${tag}>`;
        }).join('\n');
      };

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GymManagerExport date="${new Date().toISOString()}">
  <Members>
${toXmlRows('Member', membersRes.data || [])}
  </Members>
  <Subscriptions>
${toXmlRows('Subscription', subscriptionsRes.data || [])}
  </Subscriptions>
  <Payments>
${toXmlRows('Payment', paymentsRes.data || [])}
  </Payments>
  <Plans>
${toXmlRows('Plan', plansRes.data || [])}
  </Plans>
  <Settings>
${toXmlRows('Setting', settingsRes.data || [])}
  </Settings>
  <Expenses>
${toXmlRows('Expense', expensesRes.data || [])}
  </Expenses>
</GymManagerExport>`;

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymmanager-export-${new Date().toISOString().slice(0, 10)}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export terminé', description: 'Le fichier XML a été téléchargé.' });
    } catch {
      toast({ title: 'Erreur', description: "Échec de l'export", variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleResetDatabase = async () => {
    if (!password || !profile?.email) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-database', {
        body: { email: profile.email, password },
      });
      if (error) throw error;
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
            Téléchargez toutes les données (Membres, Abonnements, Paiements, Config) au format XML.
          </p>
          <Button onClick={handleExportXML} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exporter en XML
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
