export interface Member {
  id: string;
  fullName: string;
  phone: string;
  cin: string;
  qrCode: string;
  joinDate: string;
  photoUrl?: string;
}

export interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  plan: 'monthly' | 'quarterly' | 'annual';
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  amountMAD: number;
  paidMAD: number;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amountMAD: number;
  method: 'cash' | 'tpe' | 'transfer';
  date: string;
  subscriptionId: string;
}

export interface AccessLog {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  status: 'granted' | 'expired' | 'balance_due';
  balanceDueMAD?: number;
}

export type PlanConfig = {
  label: string;
  months: number;
  priceMAD: number;
};

export const PLANS: Record<string, PlanConfig> = {
  monthly: { label: 'Mensuel', months: 1, priceMAD: 300 },
  quarterly: { label: 'Trimestriel', months: 3, priceMAD: 800 },
  annual: { label: 'Annuel', months: 12, priceMAD: 2800 },
};
