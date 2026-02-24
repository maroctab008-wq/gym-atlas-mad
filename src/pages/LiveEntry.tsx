import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScan = useCallback(async (code: string) => {
    if (!code.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);

    const { data, error } = await api.post('/access-logs/scan', { barcode: code.trim() });

    if (data) {
      setScanResult(data);
    } else {
      setScanResult({ status: 'expired', memberName: 'Erreur', message: error || 'Erreur inconnue' });
    }
    setScanning(false);
  }, [scanning]);

  // Global keyboard listener for barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== inputRef.current) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        if (code.length >= 3) { setQrInput(code); handleScan(code); }
        barcodeBufferRef.current = '';
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        return;
      }

      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => { barcodeBufferRef.current = ''; }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  const handleManualScan = () => handleScan(qrInput);

  const statusStyles = {
    granted: { bg: 'bg-success/5 border-success/40', icon: CheckCircle2, iconClass: 'text-success', textClass: 'text-success' },
    expired: { bg: 'bg-destructive/5 border-destructive/40', icon: XCircle, iconClass: 'text-destructive', textClass: 'text-destructive' },
    balance_due: { bg: 'bg-warning/5 border-warning/40', icon: AlertTriangle, iconClass: 'text-warning', textClass: 'text-warning' },
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-foreground">Entrée Live</h1><p className="text-muted-foreground text-sm mt-1">Scannez un code-barres ou saisissez-le manuellement</p></div>
      <Card className="shadow-sm max-w-lg mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary"><ScanLine className="w-6 h-6 text-primary" /><div><p className="text-sm font-medium">Scanner Code-Barres</p><p className="text-xs text-muted-foreground">Utilisez votre douchette ou saisissez le code manuellement</p></div></div>
          <div className="flex gap-2">
            <Input ref={inputRef} value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Code-barres du membre..." className="font-mono" onKeyDown={(e) => e.key === 'Enter' && handleManualScan()} autoFocus />
            <Button onClick={handleManualScan} disabled={!qrInput || scanning} className="px-6">{scanning ? 'Scan...' : 'Vérifier'}</Button>
          </div>
          <div className="text-xs text-muted-foreground">💡 La douchette code-barres est détectée automatiquement (émulation clavier HID)</div>
        </CardContent>
      </Card>

      {scanResult && (
        <Card className={`max-w-lg mx-auto border-2 ${statusStyles[scanResult.status].bg} transition-all`}>
          <CardContent className="p-8 text-center space-y-4">
            {(() => { const Icon = statusStyles[scanResult.status].icon; return <Icon className={`w-16 h-16 mx-auto ${statusStyles[scanResult.status].iconClass}`} />; })()}
            <div>
              <h2 className={`text-xl font-semibold ${statusStyles[scanResult.status].textClass}`}>
                {scanResult.status === 'granted' ? 'ACCÈS AUTORISÉ' : scanResult.status === 'expired' ? 'ACCÈS REFUSÉ' : 'SOLDE DÛ'}
              </h2>
              <p className="text-lg font-medium mt-2">{scanResult.memberName}</p>
              <p className="text-sm text-muted-foreground mt-1">{scanResult.message}</p>
              {scanResult.balanceDue && <p className="text-lg font-semibold text-warning mt-2">{formatMAD(scanResult.balanceDue)} restant</p>}
              <p className="text-xs text-muted-foreground font-mono mt-3">{formatTimeFR(new Date().toISOString())}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
