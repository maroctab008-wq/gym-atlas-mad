import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Save, Loader2, Building2, CreditCard, Users, ShieldCheck, Shield, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import PlanManagement from "@/components/PlanManagement";
import GroupManagement from "@/components/GroupManagement";
import UserManagement from "@/components/UserManagement";
import MaintenanceSection from "@/components/MaintenanceSection";
import PortailSection from "@/components/PortailSection";

interface BrandingData { gym_name: string; phone: string; website: string; address: string; ice: string; logo_url: string; }

export default function Settings() {
  const { can, loading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [blockAfterDays, setBlockAfterDays] = useState(7);
  const [allowBalanceDue, setAllowBalanceDue] = useState(true);
  const [daysTolerance, setDaysTolerance] = useState(3);
  const [branding, setBranding] = useState<BrandingData>({ gym_name: "", phone: "", website: "", address: "", ice: "", logo_url: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get('/settings');
      if (data) {
        for (const row of data) {
          const v = row.value as Record<string, any>;
          if (row.key === "access_rules") {
            setBlockAfterDays(v.block_after_days_late ?? 7);
            setAllowBalanceDue(v.allow_balance_due_entry ?? true);
            setDaysTolerance(v.days_tolerance ?? 3);
          }
          if (row.key === "gym_branding") setBranding(v as BrandingData);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveSection = async (key: string, value: Record<string, any>) => {
    setSaving(key);
    const { error } = await api.put(`/settings/${key}`, { value });
    setSaving("");
    if (error) toast({ title: "Erreur", description: error, variant: "destructive" });
    else toast({ title: "Paramètres enregistrés" });
  };

  if (permLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!can('settings_access')) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Accès réservé — votre groupe n'a pas cette permission</p></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-foreground">Paramètres</h1><p className="text-muted-foreground text-sm mt-1">Configuration du système</p></div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="groups" className="gap-2"><ShieldCheck className="w-4 h-4" />Groupes</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2"><CreditCard className="w-4 h-4" />Plans</TabsTrigger>
          <TabsTrigger value="access" className="gap-2"><SettingsIcon className="w-4 h-4" />Règles d'Accès</TabsTrigger>
          <TabsTrigger value="branding" className="gap-2"><Building2 className="w-4 h-4" />Identité</TabsTrigger>
          <TabsTrigger value="gate" className="gap-2"><Shield className="w-4 h-4" />Portail</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Wrench className="w-4 h-4" />Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="groups"><GroupManagement /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="plans"><PlanManagement /></TabsContent>

        <TabsContent value="access">
          <Card className="shadow-sm max-w-xl">
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><SettingsIcon className="w-4 h-4" />Règles d'Accès</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Label className="text-sm">Bloquer l'accès après (jours de retard)</Label><Input type="number" min={1} max={90} value={blockAfterDays} onChange={(e) => setBlockAfterDays(Number(e.target.value))} /><p className="text-xs text-muted-foreground">Les membres avec un paiement en retard de plus de {blockAfterDays} jours seront bloqués</p></div>
              <div className="space-y-2"><Label className="text-sm">Jours de tolérance après expiration</Label><Input type="number" min={0} max={30} value={daysTolerance} onChange={(e) => setDaysTolerance(Number(e.target.value))} /></div>
              <div className="flex items-center justify-between"><div><Label className="text-sm">Autoriser l'entrée avec solde dû</Label></div><Switch checked={allowBalanceDue} onCheckedChange={setAllowBalanceDue} /></div>
              <Button onClick={() => saveSection("access_rules", { block_after_days_late: blockAfterDays, allow_balance_due_entry: allowBalanceDue, days_tolerance: daysTolerance })} disabled={saving === "access_rules"} className="gap-2">
                {saving === "access_rules" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="shadow-sm max-w-xl">
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" />Identité Visuelle (Factures)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="text-sm">Nom de la salle</Label><Input value={branding.gym_name} onChange={(e) => setBranding({ ...branding, gym_name: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-sm">Téléphone</Label><Input value={branding.phone} onChange={(e) => setBranding({ ...branding, phone: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-sm">Site Web</Label><Input value={branding.website} onChange={(e) => setBranding({ ...branding, website: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-sm">Adresse</Label><Input value={branding.address} onChange={(e) => setBranding({ ...branding, address: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-sm">ICE</Label><Input value={branding.ice} onChange={(e) => setBranding({ ...branding, ice: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-sm">URL du Logo</Label><Input value={branding.logo_url} onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })} className="mt-1" /></div>
              <Button onClick={() => saveSection("gym_branding", branding)} disabled={saving === "gym_branding"} className="gap-2">
                {saving === "gym_branding" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gate"><PortailSection /></TabsContent>
        <TabsContent value="maintenance"><MaintenanceSection /></TabsContent>
      </Tabs>
    </div>
  );
}
