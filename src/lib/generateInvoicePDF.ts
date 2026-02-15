import jsPDF from 'jspdf';
import { numberToWordsFR } from './numberToWords';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  memberName: string;
  memberCIN: string;
  planLabel: string;
  planMonths: number;
  amountMAD: number;
  paymentMethod: string;
  chequeNumber?: string;
  branding: {
    gym_name: string;
    phone: string;
    website: string;
    address: string;
    ice: string;
    logo_url: string;
  };
}

const methodLabels: Record<string, string> = {
  cash: 'Espèces',
  tpe: 'TPE',
  cheque: 'Chèque',
  transfer: 'Virement',
};

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header - Gym info
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.branding.gym_name || 'GymManager', margin, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  let headerY = 32;
  if (data.branding.address) { doc.text(data.branding.address, margin, headerY); headerY += 5; }
  if (data.branding.phone) { doc.text(`Tél: ${data.branding.phone}`, margin, headerY); headerY += 5; }
  if (data.branding.website) { doc.text(data.branding.website, margin, headerY); headerY += 5; }

  // Invoice title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - margin, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${data.invoiceNumber}`, pageWidth - margin, 33, { align: 'right' });
  doc.text(`Date: ${data.date}`, pageWidth - margin, 40, { align: 'right' });

  // Divider
  const dividerY = Math.max(headerY + 5, 50);
  doc.setDrawColor(200);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // Client info
  let y = dividerY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Client:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.memberName, margin + 20, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CIN:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.memberCIN, margin + 20, y);
  y += 12;

  // Table header
  const colX = [margin, margin + 80, margin + 130];
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Désignation', colX[0], y);
  doc.text('Prix Unitaire', colX[1], y);
  doc.text('Total', colX[2], y);
  y += 10;

  // Table row
  doc.setFont('helvetica', 'normal');
  const designation = `Abonnement ${data.planLabel} - ${data.planMonths} mois`;
  doc.text(designation, colX[0], y);
  doc.text(`${data.amountMAD.toLocaleString('fr-FR')} MAD`, colX[1], y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.amountMAD.toLocaleString('fr-FR')} MAD`, colX[2], y);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Total
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${data.amountMAD.toLocaleString('fr-FR')} MAD`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Payment method
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let methodText = `Mode de paiement: ${methodLabels[data.paymentMethod] || data.paymentMethod}`;
  if (data.paymentMethod === 'cheque' && data.chequeNumber) {
    methodText += ` (N° ${data.chequeNumber})`;
  }
  doc.text(methodText, pageWidth - margin, y, { align: 'right' });
  y += 12;

  // Legal mention
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const wordsAmount = numberToWordsFR(data.amountMAD);
  const capitalizedWords = wordsAmount.charAt(0).toUpperCase() + wordsAmount.slice(1);
  doc.text(`Arrêté la présente facture à la somme de ${capitalizedWords} Dirhams.`, margin, y);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  if (data.branding.ice) {
    doc.text(`ICE: ${data.branding.ice}`, margin, footerY);
  }
  doc.text(`${data.branding.gym_name} - Tous droits réservés`, pageWidth - margin, footerY, { align: 'right' });

  // Download
  doc.save(`Facture-${data.invoiceNumber}.pdf`);
}
