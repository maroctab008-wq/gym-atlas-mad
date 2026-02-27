
-- Function to check if a user's group has a specific permission
CREATE OR REPLACE FUNCTION public.has_group_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permission_groups pg ON pg.id = ur.group_id
    WHERE ur.user_id = _user_id
      AND (pg.permissions->>_permission)::boolean = true
  )
$$;

-- =============================================
-- DROP ALL EXISTING RLS POLICIES
-- =============================================

-- access_logs
DROP POLICY IF EXISTS "Authenticated users can insert access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated users can view access logs" ON public.access_logs;

-- app_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.app_settings;

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- expenses
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff can view expenses" ON public.expenses;

-- members
DROP POLICY IF EXISTS "Admins can manage members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;
DROP POLICY IF EXISTS "Staff can delete members" ON public.members;
DROP POLICY IF EXISTS "Staff can update members" ON public.members;

-- payments
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;

-- permission_groups
DROP POLICY IF EXISTS "Admins can manage groups" ON public.permission_groups;
DROP POLICY IF EXISTS "Authenticated can view groups" ON public.permission_groups;

-- plan_configs
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plan_configs;
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plan_configs;

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- subscriptions
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff can update subscriptions" ON public.subscriptions;

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- =============================================
-- NEW GROUP-BASED RLS POLICIES
-- =============================================

-- access_logs
CREATE POLICY "View access logs" ON public.access_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert access logs" ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'access_override') OR has_group_permission(auth.uid(), 'members_add'));

-- app_settings
CREATE POLICY "View settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));

-- audit_logs
CREATE POLICY "View audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- expenses
CREATE POLICY "View expenses" ON public.expenses FOR SELECT TO authenticated
  USING (has_group_permission(auth.uid(), 'expenses_view'));
CREATE POLICY "Insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'expenses_import'));
CREATE POLICY "Update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'expenses_import'));
CREATE POLICY "Delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));

-- members
CREATE POLICY "View members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'members_add'));
CREATE POLICY "Update members" ON public.members FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'members_edit'));
CREATE POLICY "Delete members" ON public.members FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'members_delete'));

-- payments
CREATE POLICY "View payments" ON public.payments FOR SELECT TO authenticated
  USING (has_group_permission(auth.uid(), 'payments_view'));
CREATE POLICY "Insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'payments_create'));
CREATE POLICY "Update payments" ON public.payments FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'payments_create'));
CREATE POLICY "Delete payments" ON public.payments FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'payments_delete'));

-- permission_groups
CREATE POLICY "View groups" ON public.permission_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage groups" ON public.permission_groups FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Update groups" ON public.permission_groups FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Delete groups" ON public.permission_groups FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));

-- plan_configs
CREATE POLICY "View plans" ON public.plan_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage plans" ON public.plan_configs FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Update plans" ON public.plan_configs FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Delete plans" ON public.plan_configs FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));

-- profiles
CREATE POLICY "View own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- subscriptions
CREATE POLICY "View subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'payments_create') OR has_group_permission(auth.uid(), 'members_add'));
CREATE POLICY "Update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'payments_create') OR has_group_permission(auth.uid(), 'members_edit'));
CREATE POLICY "Delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));

-- user_roles
CREATE POLICY "View own role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Manage roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));
CREATE POLICY "Delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (has_group_permission(auth.uid(), 'settings_access'));
