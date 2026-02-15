import { Member, Subscription, Payment, AccessLog } from '@/types/gym';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addMonths = (d: Date, m: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
};
const subDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  return r;
};

export const mockMembers: Member[] = [
  { id: 'm1', fullName: 'Youssef El Amrani', phone: '0661234567', cin: 'AB123456', qrCode: 'QR-M1-2024', joinDate: '2024-01-15' },
  { id: 'm2', fullName: 'Fatima Zahra Bennani', phone: '0672345678', cin: 'CD789012', qrCode: 'QR-M2-2024', joinDate: '2024-02-20' },
  { id: 'm3', fullName: 'Karim Idrissi', phone: '0683456789', cin: 'EF345678', qrCode: 'QR-M3-2024', joinDate: '2024-03-10' },
  { id: 'm4', fullName: 'Amina Tazi', phone: '0694567890', cin: 'GH901234', qrCode: 'QR-M4-2024', joinDate: '2024-04-05' },
  { id: 'm5', fullName: 'Omar Cherkaoui', phone: '0605678901', cin: 'IJ567890', qrCode: 'QR-M5-2024', joinDate: '2024-05-18' },
  { id: 'm6', fullName: 'Salma Alaoui', phone: '0616789012', cin: 'KL234567', qrCode: 'QR-M6-2024', joinDate: '2024-06-22' },
  { id: 'm7', fullName: 'Mehdi Fassi', phone: '0627890123', cin: 'MN890123', qrCode: 'QR-M7-2024', joinDate: '2024-07-01' },
  { id: 'm8', fullName: 'Nadia Berrada', phone: '0638901234', cin: 'OP456789', qrCode: 'QR-M8-2024', joinDate: '2024-08-14' },
];

export const mockSubscriptions: Subscription[] = [
  { id: 's1', memberId: 'm1', memberName: 'Youssef El Amrani', plan: 'annual', status: 'active', startDate: fmt(subDays(today, 60)), endDate: fmt(addMonths(subDays(today, 60), 12)), amountMAD: 2800, paidMAD: 2800 },
  { id: 's2', memberId: 'm2', memberName: 'Fatima Zahra Bennani', plan: 'monthly', status: 'active', startDate: fmt(subDays(today, 10)), endDate: fmt(addMonths(subDays(today, 10), 1)), amountMAD: 300, paidMAD: 300 },
  { id: 's3', memberId: 'm3', memberName: 'Karim Idrissi', plan: 'quarterly', status: 'pending', startDate: fmt(subDays(today, 5)), endDate: fmt(addMonths(subDays(today, 5), 3)), amountMAD: 800, paidMAD: 500 },
  { id: 's4', memberId: 'm4', memberName: 'Amina Tazi', plan: 'monthly', status: 'expired', startDate: fmt(subDays(today, 45)), endDate: fmt(subDays(today, 15)), amountMAD: 300, paidMAD: 300 },
  { id: 's5', memberId: 'm5', memberName: 'Omar Cherkaoui', plan: 'annual', status: 'active', startDate: fmt(subDays(today, 100)), endDate: fmt(addMonths(subDays(today, 100), 12)), amountMAD: 2800, paidMAD: 2000 },
  { id: 's6', memberId: 'm6', memberName: 'Salma Alaoui', plan: 'monthly', status: 'active', startDate: fmt(subDays(today, 3)), endDate: fmt(addMonths(subDays(today, 3), 1)), amountMAD: 300, paidMAD: 300 },
  { id: 's7', memberId: 'm7', memberName: 'Mehdi Fassi', plan: 'quarterly', status: 'active', startDate: fmt(subDays(today, 20)), endDate: fmt(addMonths(subDays(today, 20), 3)), amountMAD: 800, paidMAD: 800 },
  { id: 's8', memberId: 'm8', memberName: 'Nadia Berrada', plan: 'monthly', status: 'pending', startDate: fmt(subDays(today, 2)), endDate: fmt(addMonths(subDays(today, 2), 1)), amountMAD: 300, paidMAD: 150 },
];

export const mockPayments: Payment[] = [
  { id: 'p1', memberId: 'm1', memberName: 'Youssef El Amrani', amountMAD: 2800, method: 'transfer', date: fmt(subDays(today, 60)), subscriptionId: 's1' },
  { id: 'p2', memberId: 'm2', memberName: 'Fatima Zahra Bennani', amountMAD: 300, method: 'cash', date: fmt(subDays(today, 10)), subscriptionId: 's2' },
  { id: 'p3', memberId: 'm3', memberName: 'Karim Idrissi', amountMAD: 500, method: 'tpe', date: fmt(subDays(today, 5)), subscriptionId: 's3' },
  { id: 'p4', memberId: 'm4', memberName: 'Amina Tazi', amountMAD: 300, method: 'cash', date: fmt(subDays(today, 45)), subscriptionId: 's4' },
  { id: 'p5', memberId: 'm5', memberName: 'Omar Cherkaoui', amountMAD: 2000, method: 'transfer', date: fmt(subDays(today, 100)), subscriptionId: 's5' },
  { id: 'p6', memberId: 'm6', memberName: 'Salma Alaoui', amountMAD: 300, method: 'cash', date: fmt(subDays(today, 3)), subscriptionId: 's6' },
  { id: 'p7', memberId: 'm7', memberName: 'Mehdi Fassi', amountMAD: 800, method: 'tpe', date: fmt(subDays(today, 20)), subscriptionId: 's7' },
  { id: 'p8', memberId: 'm8', memberName: 'Nadia Berrada', amountMAD: 150, method: 'cash', date: fmt(subDays(today, 2)), subscriptionId: 's8' },
];

export const mockAccessLogs: AccessLog[] = [
  { id: 'a1', memberId: 'm1', memberName: 'Youssef El Amrani', timestamp: new Date(today.getTime() - 3600000).toISOString(), status: 'granted' },
  { id: 'a2', memberId: 'm2', memberName: 'Fatima Zahra Bennani', timestamp: new Date(today.getTime() - 7200000).toISOString(), status: 'granted' },
  { id: 'a3', memberId: 'm3', memberName: 'Karim Idrissi', timestamp: new Date(today.getTime() - 1800000).toISOString(), status: 'balance_due', balanceDueMAD: 300 },
  { id: 'a4', memberId: 'm4', memberName: 'Amina Tazi', timestamp: new Date(today.getTime() - 900000).toISOString(), status: 'expired' },
  { id: 'a5', memberId: 'm5', memberName: 'Omar Cherkaoui', timestamp: new Date(today.getTime() - 600000).toISOString(), status: 'balance_due', balanceDueMAD: 800 },
  { id: 'a6', memberId: 'm6', memberName: 'Salma Alaoui', timestamp: new Date(today.getTime() - 300000).toISOString(), status: 'granted' },
];

// Chart data
export const attendanceData = [
  { day: 'Lun', entries: 45 },
  { day: 'Mar', entries: 52 },
  { day: 'Mer', entries: 38 },
  { day: 'Jeu', entries: 61 },
  { day: 'Ven', entries: 55 },
  { day: 'Sam', entries: 72 },
  { day: 'Dim', entries: 28 },
];

export const monthlyIncomeData = [
  { month: 'Sep', income: 18500 },
  { month: 'Oct', income: 22000 },
  { month: 'Nov', income: 19800 },
  { month: 'Déc', income: 25600 },
  { month: 'Jan', income: 21400 },
  { month: 'Fév', income: 24300 },
];
