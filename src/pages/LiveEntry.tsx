import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatMAD, formatTimeFR } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';

type ScanResult = {
  status: 'granted' | 'expired' | 'balance_due';
  memberName: string;
  message: string;
  balanceDue?: number;
} | null;

export default function LiveEntry() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(false);
  const [daysTolerance, setDaysTolerance] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load days_tolerance from settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'access_rules').maybeSingle();
      if (data) {
        const v = data.value as Record<string, any>;
        setDaysTolerance(v.days_tolerance ?? 3);
      }
    };
    loadSettings();
  }, []);

  const handleScan = useCallback(async (code: string) => {
    if (!code.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);

    // Look up member by barcode (qr_code field)
    const { data: member } = await supabase
      .from('members')
      .select('id, full_name, qr_code')
      .eq('qr_code', code.trim())
      .limit(1)
      .maybeSingle();

    if (!member) {
      setScanResult({ status: 'expired', memberName: 'Inconnu', message: 'Code-barres non reconnu' });
      await logAccess(null, 'expired', code.trim());
      setScanning(false);
      return;
    }

    // Check active subscription
    const today = new Date().toISOString().split('T')[0];
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status, amount_mad, paid_mad, end_date')
      .eq('member_id', member.id)
      .gte('end_date', today)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check all subscriptions (including recently expired within tolerance)
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('id, status, amount_mad, paid_mad, end_date, start_date')
      .eq('member_id', member.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestSub = allSubs || sub;

    if (!latestSub) {
      setScanResult({ status: 'expired', memberName: member.full_name, message: 'Aucun abonnement trouvé' });
      await logAccess(member.id, 'expired');
    } else {
      const endDate = new Date(latestSub.end_date);
      const todayDate = new Date();
      const daysSinceExpiry = Math.floor((todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = latestSub.status === 'expired' || daysSinceExpiry > 0;
      const hasBalance = latestSub.paid_mad < latestSub.amount_mad;
      const balance = latestSub.amount_mad - latestSub.paid_mad;
      const isPending = latestSub.status === 'pending' && latestSub.paid_mad === 0;

      if (!isExpired && !hasBalance) {
        // GREEN: Active + fully paid
        setScanResult({ status: 'granted', memberName: member.full_name, message: 'Accès autorisé' });
        await logAccess(member.id, 'granted');
      } else if (isPending) {
        // RED: Pending with no initial payment
        setScanResult({ status: 'expired', memberName: member.full_name, message: 'En attente — Aucun paiement initial' });
        await logAccess(member.id, 'expired');
      } else if ((isExpired && daysSinceExpiry <= daysTolerance) || (!isExpired && hasBalance)) {
        // ORANGE: Within tolerance or has balance due
        setScanResult({
          status: 'balance_due',
          memberName: member.full_name,
          message: 'Accès autorisé — Régularisation demandée',
          balanceDue: hasBalance ? balance : undefined,
        });
        await logAccess(member.id, 'balance_due', undefined, hasBalance ? balance : 0);
      } else {
        // RED: Expired beyond tolerance
        setScanResult({ status: 'expired', memberName: member.full_name, message: 'Accès refusé — Abonnement expiré' });
        await logAccess(member.id, 'expired');
      }
    }
    setScanning(false);
  }, [scanning]);

  const logAccess = async (memberId: string | null, status: string, code?: string, balanceDue?: number) => {
    if (!memberId) return;
    try {
      await supabase.from('access_logs').insert({
        member_id: memberId,
        status,
        balance_due_mad: balanceDue || null,
        authorized_by: user?.id || null,
      });
    } catch (e) {
      // Silent fail for logging
    }
  };

  // Global keyboard listener for barcode scanner (HID emulation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a regular input (except our barcode input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== inputRef.current) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        if (code.length >= 3) {
          setQrInput(code);
          handleScan(code);
        }
        barcodeBufferRef.current = '';
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        return;
      }

      // Only capture printable characters
      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        // Reset buffer after 100ms of inactivity (barcode scanners type fast)
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  const handleManualScan = () => {
    handleScan(qrInput);
  };

  const statusStyles = {
    granted: { bg: 'bg-success/5 border-success/40', icon: CheckCircle2, iconClass: 'text-success', textClass: 'text-success' },
    expired: { bg: 'bg-destructive/5 border-destructive/40', icon: XCircle, iconClass: 'text-destructive', textClass: 'text-destructive' },
    balance_due: { bg: 'bg-warning/5 border-warning/40', icon: AlertTriangle, iconClass: 'text-warning', textClass: 'text-warning' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Entrée Live</h1>
        <p className="text-muted-foreground text-sm mt-1">Scannez un code-barres ou saisissez-le manuellement</p>
      </div>

      <Card className="shadow-sm max-w-lg mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary">
            <ScanLine className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Scanner Code-Barres</p>
              <p className="text-xs text-muted-foreground">Utilisez votre douchette ou saisissez le code manuellement</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Code-barres du membre..."
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              autoFocus
            />
            <Button
              onClick={handleManualScan}
              disabled={!qrInput || scanning}
              className="px-6"
            >
              {scanning ? 'Scan...' : 'Vérifier'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 La douchette code-barres est détectée automatiquement (émulation clavier HID)
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {scanResult && (
        <Card className={`max-w-lg mx-auto border-2 ${statusStyles[scanResult.status].bg} transition-all`}>
          <CardContent className="p-8 text-center space-y-4">
            {(() => {
              const Icon = statusStyles[scanResult.status].icon;
              return <Icon className={`w-16 h-16 mx-auto ${statusStyles[scanResult.status].iconClass}`} />;
            })()}
            <div>
              <h2 className={`text-xl font-semibold ${statusStyles[scanResult.status].textClass}`}>
                {scanResult.status === 'granted' ? 'ACCÈS AUTORISÉ' : scanResult.status === 'expired' ? 'ACCÈS REFUSÉ' : 'SOLDE DÛ'}
              </h2>
              <p className="text-lg font-medium mt-2">{scanResult.memberName}</p>
              <p className="text-sm text-muted-foreground mt-1">{scanResult.message}</p>
              {scanResult.balanceDue && (
                <p className="text-lg font-semibold text-warning mt-2">
                  {formatMAD(scanResult.balanceDue)} restant
                </p>
              )}
              <p className="text-xs text-muted-foreground font-mono mt-3">
                {formatTimeFR(new Date().toISOString())}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}