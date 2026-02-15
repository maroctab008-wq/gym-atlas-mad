import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { mockMembers, mockSubscriptions } from '@/data/mockData';
import { formatMAD, formatTimeFR } from '@/lib/formatters';

type ScanResult = {
  status: 'granted' | 'expired' | 'balance_due';
  memberName: string;
  message: string;
  balanceDue?: number;
} | null;

export default function LiveEntry() {
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const member = mockMembers.find(m => m.qrCode.toLowerCase() === qrInput.toLowerCase());
      if (!member) {
        setScanResult({ status: 'expired', memberName: 'Inconnu', message: 'QR Code non reconnu' });
      } else {
        const sub = mockSubscriptions.find(s => s.memberId === member.id);
        if (!sub || sub.status === 'expired') {
          setScanResult({ status: 'expired', memberName: member.fullName, message: 'Abonnement expiré' });
        } else if (sub.paidMAD < sub.amountMAD) {
          setScanResult({
            status: 'balance_due',
            memberName: member.fullName,
            message: 'Accès autorisé — Solde en cours',
            balanceDue: sub.amountMAD - sub.paidMAD,
          });
        } else {
          setScanResult({ status: 'granted', memberName: member.fullName, message: 'Accès autorisé' });
        }
      }
      setScanning(false);
    }, 800);
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
        <p className="text-muted-foreground text-sm mt-1">Simulez un scan QR pour contrôler l'accès</p>
      </div>

      <Card className="shadow-sm max-w-lg mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary">
            <ScanLine className="w-6 h-6 text-primary" />
            <p className="text-sm text-muted-foreground">Scanner QR Code</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Entrez le code QR (ex: QR-M1-2024)"
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <Button
              onClick={handleScan}
              disabled={!qrInput || scanning}
              className="px-6"
            >
              {scanning ? 'Scan...' : 'Vérifier'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Codes de test: QR-M1-2024, QR-M3-2024, QR-M4-2024
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
