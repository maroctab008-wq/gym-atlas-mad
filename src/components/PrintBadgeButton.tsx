import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface PrintBadgeButtonProps {
  member: {
    full_name: string;
    qr_code: string;
    photo_url?: string | null;
    join_date?: string;
  };
}

export default function PrintBadgeButton({ member }: PrintBadgeButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    // Create a hidden container for the badge
    const container = document.createElement('div');
    container.id = 'print-badge-container';
    container.innerHTML = `
      <style>
        @page {
          size: 85mm 55mm;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 85mm;
            height: 55mm;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > *:not(#print-badge-container) { display: none !important; }
          #print-badge-container {
            display: flex !important;
            justify-content: center;
            align-items: center;
            width: 85mm;
            height: 55mm;
            margin: 0;
            padding: 0;
          }
        }
        @media screen {
          #print-badge-container { position: fixed; top: -9999px; left: -9999px; }
        }
        .badge-card {
          width: 85mm;
          height: 55mm;
          padding: 4mm 5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
          background: white;
          color: #1a1a2e;
          box-sizing: border-box;
        }
        .badge-brand {
          font-size: 13pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #2563eb;
        }
        .badge-member-name {
          font-size: 11pt;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
        }
        .badge-join-date {
          font-size: 8pt;
          color: #6b7280;
        }
        .badge-barcode svg {
          width: 65mm;
          height: 14mm;
        }
      </style>
      <div class="badge-card">
        <div class="badge-brand">Devsoltech</div>
        <div class="badge-member-name">${member.full_name}</div>
        <div class="badge-join-date">Membre depuis : ${member.join_date ? new Date(member.join_date).toLocaleDateString('fr-FR') : ''}</div>
        <div class="badge-barcode"><svg id="badge-barcode-svg"></svg></div>
      </div>
    `;
    document.body.appendChild(container);

    // Generate barcode
    try {
      JsBarcode('#badge-barcode-svg', member.qr_code, {
        format: 'CODE128',
        width: 1.5,
        height: 35,
        displayValue: true,
        fontSize: 10,
        font: 'JetBrains Mono',
        margin: 2,
      });
    } catch {
      // fallback if barcode fails
    }

    // Trigger print
    setTimeout(() => {
      window.print();
      // Cleanup after print
      setTimeout(() => {
        document.body.removeChild(container);
      }, 500);
    }, 100);
  }, [member]);

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer className="w-3.5 h-3.5" />
      Badge
    </Button>
  );
}
