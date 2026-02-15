import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockAfterDays, setBlockAfterDays] = useState(7);
  const [allowBalanceDue, setAllowBalanceDue] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'access_rules')
        .single();
      if (data?.value) {
        const v = data.value as { block_after_days_late?: number; allow_balance_due_entry?: boolean };
        setBlockAfterDays(v.block_after_days_late ?? 7);
        setAllowBalanceDue(v.allow_balance_due_entry ?? true);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({
        value: { block_after_days_late: blockAfterDays, allow_balance_due_entry: allowBalanceDue },
      })
      .eq('key', 'access_rules');
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Paramètres enregistrés' });
    }
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">Configuration des règles d'accès</p>
      </div>

      <Card className="shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Règles d'Accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm">Bloquer l'accès après (jours de retard)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={blockAfterDays}
              onChange={(e) => setBlockAfterDays(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Les membres avec un paiement en retard de plus de {blockAfterDays} jours seront bloqués
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Autoriser l'entrée avec solde dû</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permettre l'accès aux membres avec un solde impayé
              </p>
            </div>
            <Switch checked={allowBalanceDue} onCheckedChange={setAllowBalanceDue} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
