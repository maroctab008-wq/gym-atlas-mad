import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanConfig {
  id: string;
  label: string;
  months: number;
  price_mad: number;
  is_active: boolean;
}

export function usePlans() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plan_configs')
      .select('id, label, months, price_mad, is_active')
      .eq('is_active', true)
      .order('months');
    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const plansMap: Record<string, { label: string; months: number; priceMAD: number }> = {};
  plans.forEach(p => {
    const key = p.label.toLowerCase().replace(/\s+/g, '_');
    plansMap[key] = { label: p.label, months: p.months, priceMAD: p.price_mad };
  });

  return { plans, plansMap, loading, refetch: fetchPlans };
}
