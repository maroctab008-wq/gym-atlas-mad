
-- Dynamic plan management table
CREATE TABLE public.plan_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  months integer NOT NULL,
  price_mad numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active plans" ON public.plan_configs
FOR SELECT USING (true);

CREATE POLICY "Admins can manage plans" ON public.plan_configs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default plans
INSERT INTO public.plan_configs (label, months, price_mad) VALUES
  ('Mensuel', 1, 300),
  ('Trimestriel', 3, 800),
  ('Annuel', 12, 2800);

-- Trigger for updated_at
CREATE TRIGGER update_plan_configs_updated_at
BEFORE UPDATE ON public.plan_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
