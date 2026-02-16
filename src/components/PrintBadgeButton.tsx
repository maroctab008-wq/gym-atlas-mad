import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface PrintBadgeButtonProps {
  member: {
    full_name: string;
    qr_code: string;
    photo_url?: string | null;
  };
  gymName?: string;
}

export default function PrintBadgeButton({ member, gymName = 'GYM ATLAS' }: PrintBadgeButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    // Create a hidden container for the badge
    const container = document.createElement('div');
    container.id = 'print-badge-container';
    container.innerHTML = `
      <style>
        @media print {
          body > *:not(#print-badge-container) { display: none !important; }
          #print-badge-container { display: flex !important; justify-content: center; align-items: center; height: 100vh; }
        }
        @media screen {
          #print-badge-container { position: fixed; top: -9999px; left: -9999px; }
        }
        .badge-card {
          width: 85mm;
          height: 55mm;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 6mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
          background: white;
          color: #1a1a2e;
          box-sizing: border-box;
        }
        .badge-gym-name {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #2563eb;
        }
        .badge-photo {
          width: 18mm;
          height: 18mm;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #2563eb;
        }
        .badge-photo-placeholder {
          width: 18mm;
          height: 18mm;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18pt;
          font-weight: 600;
          color: #6b7280;
        }
        .badge-member-name {
          font-size: 10pt;
          font-weight: 600;
          text-align: center;
          margin: 1mm 0;
        }
        .badge-barcode svg {
          width: 55mm;
          height: 12mm;
        }
      </style>
      <div class="badge-card">
        <div class="badge-gym-name">${gymName}</div>
        ${member.photo_url
          ? `<img class="badge-photo" src="${member.photo_url}" alt="${member.full_name}" />`
          : `<div class="badge-photo-placeholder">${member.full_name.charAt(0).toUpperCase()}</div>`
        }
        <div class="badge-member-name">${member.full_name}</div>
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
  }, [member, gymName]);

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer className="w-3.5 h-3.5" />
      Badge
    </Button>
  );
}
