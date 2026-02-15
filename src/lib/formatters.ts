export const formatDateFR = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatMAD = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR')} MAD`;
};

export const formatTimeFR = (isoStr: string): string => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export const generateQRCode = (memberId: string): string => {
  return `QR-${memberId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
};
