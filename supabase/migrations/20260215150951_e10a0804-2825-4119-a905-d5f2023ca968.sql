
-- Fix overly permissive INSERT policies
DROP POLICY "Staff can insert members" ON public.members;
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);

DROP POLICY "Authenticated users can insert access logs" ON public.access_logs;
CREATE POLICY "Authenticated users can insert access logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
