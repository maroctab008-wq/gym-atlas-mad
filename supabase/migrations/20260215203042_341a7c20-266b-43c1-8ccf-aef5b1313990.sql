
-- Expenses table for tracking gym operational costs
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT,
  amount_mad NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view expenses" ON public.expenses FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));

-- Add installment_plan to payments
ALTER TABLE public.payments ADD COLUMN installment_plan TEXT DEFAULT 'total';
ALTER TABLE public.payments ADD COLUMN installment_number INTEGER DEFAULT 1;
ALTER TABLE public.payments ADD COLUMN installment_total INTEGER DEFAULT 1;
