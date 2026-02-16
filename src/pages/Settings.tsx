import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Save, Loader2, Building2, Shield, CreditCard, Users, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import PlanManagement from '@/components/PlanManagement';
import GroupManagement from '@/components/GroupManagement';
import UserManagement from '@/components/UserManagement';

interface BrandingData {
  gym_name: string; phone: string; website: string; address: string; ice: string; logo_url: string;
}

interface GateData {
  controller_ip: string; api_key: string; strict_payment_enforcement: boolean;
}

export default function Settings() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [blockAfterDays, setBlockAfterDays] = useState(7);
  const [allowBalanceDue, setAllowBalanceDue] = useState(true);
  const [branding, setBranding] = useState<BrandingData>({ gym_name: '', phone: '', website: '', address: '', ice: '', logo_url: '' });
  const [gate, setGate] = useState<GateData>({ controller_ip: '', api_key: '', strict_payment_enforcement: true });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('key, value');
      if (data) {
        for (const row of data) {
          const v = row.value as Record<string, any>;
          if (row.key === 'access_rules') { setBlockAfterDays(v.block_after_days_late ?? 7); setAllowBalanceDue(v.allow_balance_due_entry ?? true); }
          if (row.key === 'gym_branding') setBranding(v as BrandingData);
          if (row.key === 'gate_control') setGate(v as GateData);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveSection = async (key: string, value: Record<string, any>) => {
    setSaving(key);
    const { error } = await supabase.from('app_settings').update({ value }).eq('key', key);
    setSaving('');
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Paramètres enregistrés' });
  };

  if (role !== 'admin') {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Accès réservé aux administrateurs</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">Configuration du système</p>
      </div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="groups" className="gap-2"><ShieldCheck className="w-4 h-4" />Groupes</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2"><CreditCard className="w-4 h-4" />Plans</TabsTrigger>
          <TabsTrigger value="access" className="gap-2"><SettingsIcon className="w-4 h-4" />Règles d'Accès</TabsTrigger>
          <TabsTrigger value="branding" className="gap-2"><Building2 className="w-4 h-4" />Identité</TabsTrigger>
          <TabsTrigger value="gate" className="gap-2"><Shield className="w-4 h-4" />Portail</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <GroupManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="plans">
          <PlanManagement />
        </TabsContent>

        <TabsContent value="access">
          <Card className="shadow-sm max-w-xl">
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><SettingsIcon className="w-4 h-4" />Règles d'Accès</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm">Bloquer l'accès après (jours de retard)</Label>
                <Input type="number" min={1} max={90} value={blockAfterDays} onChange={(e) => setBlockAfterDays(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Les membres avec un paiement en retard de plus de {blockAfterDays} jours seront bloqués</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Autoriser l'entrée avec solde dû</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Permettre l'accès aux membres avec un solde impayé</p>
                </div>
                <Switch checked={allowBalanceDue} onCheckedChange={setAllowBalanceDue} />
              </div>
              <Button onClick={() => saveSection('access_rules', { block_after_days_late: blockAfterDays, allow_balance_due_entry: allowBalanceDue })} disabled={saving === 'access_rules'} className="gap-2">
                {saving === 'access_rules' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="shadow-sm max-w-xl">
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" />Identité Visuelle (Factures)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="text-sm">Nom de la salle</Label><Input value={branding.gym_name} onChange={e => setBranding({ ...branding, gym_name: e.target.value })} className="mt-1" placeholder="Ex: Atlas Gym" /></div>
              <div><Label className="text-sm">Téléphone</Label><Input value={branding.phone} onChange={e => setBranding({ ...branding, phone: e.target.value })} className="mt-1" placeholder="+212 600 000 000" /></div>
              <div><Label className="text-sm">Site Web</Label><Input value={branding.website} onChange={e => setBranding({ ...branding, website: e.target.value })} className="mt-1" placeholder="www.monsite.ma" /></div>
              <div><Label className="text-sm">Adresse</Label><Input value={branding.address} onChange={e => setBranding({ ...branding, address: e.target.value })} className="mt-1" placeholder="Casablanca, Maroc" /></div>
              <div><Label className="text-sm">ICE</Label><Input value={branding.ice} onChange={e => setBranding({ ...branding, ice: e.target.value })} className="mt-1" placeholder="Ex: 001234567000012" /></div>
              <div><Label className="text-sm">URL du Logo</Label><Input value={branding.logo_url} onChange={e => setBranding({ ...branding, logo_url: e.target.value })} className="mt-1" placeholder="https://..." /><p className="text-xs text-muted-foreground mt-1">Le logo apparaîtra en haut à gauche des factures</p></div>
              <Button onClick={() => saveSection('gym_branding', branding)} disabled={saving === 'gym_branding'} className="gap-2">
                {saving === 'gym_branding' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gate">
          <Card className="shadow-sm max-w-xl">
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4" />Contrôle Portail (Hardware)</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div><Label className="text-sm">Adresse IP du contrôleur</Label><Input value={gate.controller_ip} onChange={e => setGate({ ...gate, controller_ip: e.target.value })} className="mt-1 font-mono" placeholder="192.168.1.100" /></div>
              <div><Label className="text-sm">Clé API du contrôleur</Label><Input type="password" value={gate.api_key} onChange={e => setGate({ ...gate, api_key: e.target.value })} className="mt-1 font-mono" placeholder="••••••••" /></div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Application stricte du paiement</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Refuser l'accès si le solde &gt; 0 MAD</p>
                </div>
                <Switch checked={gate.strict_payment_enforcement} onCheckedChange={v => setGate({ ...gate, strict_payment_enforcement: v })} />
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2 bg-secondary/30">
                <p className="text-sm font-medium">Logique d'accès automatisée</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" /><strong className="text-foreground">Accès accordé:</strong> Abonnement actif + Solde = 0 MAD</p>
                  <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive" /><strong className="text-foreground">Accès refusé:</strong> Expiré ou Solde &gt; 0 MAD</p>
                  <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-warning" /><strong className="text-foreground">Override admin:</strong> Forcer l'ouverture (admin uniquement)</p>
                </div>
              </div>
              <Button onClick={() => saveSection('gate_control', gate)} disabled={saving === 'gate_control'} className="gap-2">
                {saving === 'gate_control' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
