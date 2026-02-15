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
    granted: { bg: 'bg-neon-green/5 border-neon-green/40 neon-glow-green', icon: CheckCircle2, iconClass: 'text-neon-green', textClass: 'text-neon-green' },
    expired: { bg: 'bg-neon-red/5 border-neon-red/40 neon-glow-red', icon: XCircle, iconClass: 'text-neon-red', textClass: 'text-neon-red' },
    balance_due: { bg: 'bg-neon-orange/5 border-neon-orange/40 neon-glow-orange', icon: AlertTriangle, iconClass: 'text-neon-orange', textClass: 'text-neon-orange' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wider text-neon-cyan">ENTRÉE LIVE</h1>
        <p className="text-muted-foreground text-sm mt-1">Simulez un scan QR pour contrôler l'accès</p>
      </div>

      <Card className="glass-panel border-border/50 max-w-lg mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border/30">
            <ScanLine className="w-6 h-6 text-primary animate-pulse-neon" />
            <p className="text-sm text-muted-foreground font-mono">Scanner QR Code</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Entrez le code QR (ex: QR-M1-2024)"
              className="bg-secondary border-border focus:border-primary font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <Button
              onClick={handleScan}
              disabled={!qrInput || scanning}
              className="font-display tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/80 neon-glow px-6"
            >
              {scanning ? 'SCAN...' : 'VÉRIFIER'}
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
              <h2 className={`text-xl font-display font-bold tracking-wider ${statusStyles[scanResult.status].textClass}`}>
                {scanResult.status === 'granted' ? 'ACCÈS AUTORISÉ' : scanResult.status === 'expired' ? 'ACCÈS REFUSÉ' : 'SOLDE DÛ'}
              </h2>
              <p className="text-lg font-medium mt-2">{scanResult.memberName}</p>
              <p className="text-sm text-muted-foreground mt-1">{scanResult.message}</p>
              {scanResult.balanceDue && (
                <p className="text-lg font-display font-bold text-neon-orange mt-2">
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
