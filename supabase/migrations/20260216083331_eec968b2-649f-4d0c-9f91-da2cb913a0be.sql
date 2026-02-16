
-- Create permission_groups table
CREATE TABLE public.permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage groups" ON public.permission_groups
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view groups" ON public.permission_groups
FOR SELECT USING (true);

-- Add group_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN group_id uuid REFERENCES public.permission_groups(id);

-- Add status to profiles for active/inactive tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Seed default groups
INSERT INTO public.permission_groups (name, permissions) VALUES
('Administrateur', '{"view_dashboard_kpis": true, "members_add": true, "members_edit": true, "members_delete": true, "payments_view": true, "payments_create": true, "payments_delete": true, "expenses_view": true, "expenses_import": true, "access_override": true, "settings_access": true}'::jsonb),
('Réceptionniste', '{"view_dashboard_kpis": false, "members_add": true, "members_edit": false, "members_delete": false, "payments_view": false, "payments_create": false, "payments_delete": false, "expenses_view": false, "expenses_import": false, "access_override": false, "settings_access": false}'::jsonb);

-- Link existing admin user_roles to the Administrateur group
UPDATE public.user_roles 
SET group_id = (SELECT id FROM public.permission_groups WHERE name = 'Administrateur')
WHERE role = 'admin';

-- Trigger for updated_at
CREATE TRIGGER update_permission_groups_updated_at
BEFORE UPDATE ON public.permission_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
