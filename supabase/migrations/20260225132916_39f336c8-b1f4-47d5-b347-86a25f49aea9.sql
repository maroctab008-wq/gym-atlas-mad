
-- =============================================
-- Fix RLS policies: Allow staff to perform CRUD operations
-- =============================================

-- Staff can update members
CREATE POLICY "Staff can update members" ON public.members FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can delete members (controlled by frontend permissions)
CREATE POLICY "Staff can delete members" ON public.members FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can insert payments
CREATE POLICY "Staff can insert payments" ON public.payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff can update payments
CREATE POLICY "Staff can update payments" ON public.payments FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can delete payments
CREATE POLICY "Staff can delete payments" ON public.payments FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can insert expenses
CREATE POLICY "Staff can insert expenses" ON public.expenses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff can update expenses
CREATE POLICY "Staff can update expenses" ON public.expenses FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can insert subscriptions
CREATE POLICY "Staff can insert subscriptions" ON public.subscriptions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Staff can update subscriptions
CREATE POLICY "Staff can update subscriptions" ON public.subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role));
