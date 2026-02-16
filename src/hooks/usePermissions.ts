import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Permissions {
  view_dashboard_kpis: boolean;
  members_add: boolean;
  members_edit: boolean;
  members_delete: boolean;
  payments_view: boolean;
  payments_create: boolean;
  payments_delete: boolean;
  expenses_view: boolean;
  expenses_import: boolean;
  access_override: boolean;
  settings_access: boolean;
}

const ALL_PERMISSIONS: Permissions = {
  view_dashboard_kpis: true,
  members_add: true,
  members_edit: true,
  members_delete: true,
  payments_view: true,
  payments_create: true,
  payments_delete: true,
  expenses_view: true,
  expenses_import: true,
  access_override: true,
  settings_access: true,
};

const NO_PERMISSIONS: Permissions = {
  view_dashboard_kpis: false,
  members_add: false,
  members_edit: false,
  members_delete: false,
  payments_view: false,
  payments_create: false,
  payments_delete: false,
  expenses_view: false,
  expenses_import: false,
  access_override: false,
  settings_access: false,
};

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  view_dashboard_kpis: 'Voir les KPIs financiers',
  members_add: 'Ajouter des membres',
  members_edit: 'Modifier des membres',
  members_delete: 'Supprimer des membres',
  payments_view: 'Voir les paiements',
  payments_create: 'Enregistrer des paiements',
  payments_delete: 'Supprimer des paiements',
  expenses_view: 'Voir les dépenses',
  expenses_import: 'Importer des dépenses',
  access_override: 'Forcer l\'ouverture du portail',
  settings_access: 'Accéder aux paramètres',
};

export const PERMISSION_CATEGORIES: Record<string, (keyof Permissions)[]> = {
  'Dashboard': ['view_dashboard_kpis'],
  'Membres': ['members_add', 'members_edit', 'members_delete'],
  'Paiements': ['payments_view', 'payments_create', 'payments_delete'],
  'Dépenses': ['expenses_view', 'expenses_import'],
  'Accès': ['access_override'],
  'Paramètres': ['settings_access'],
};

export function usePermissions() {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(NO_PERMISSIONS);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(NO_PERMISSIONS);
      setGroupName(null);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      // Admin role always gets all permissions
      if (role === 'admin') {
        // Still fetch group name for display, but permissions are full
        const { data } = await supabase
          .from('user_roles')
          .select('group_id, permission_groups(name, permissions)')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (data?.permission_groups) {
          const pg = data.permission_groups as any;
          setGroupName(pg.name);
          setPermissions(pg.permissions as Permissions);
        } else {
          setPermissions(ALL_PERMISSIONS);
          setGroupName('Administrateur');
        }
      } else {
        // For non-admin, use group permissions
        const { data } = await supabase
          .from('user_roles')
          .select('group_id, permission_groups(name, permissions)')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (data?.permission_groups) {
          const pg = data.permission_groups as any;
          setGroupName(pg.name);
          setPermissions({ ...NO_PERMISSIONS, ...(pg.permissions as Partial<Permissions>) });
        } else {
          setPermissions(NO_PERMISSIONS);
          setGroupName(null);
        }
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user, role]);

  const can = (permission: keyof Permissions) => {
    if (role === 'admin') return true;
    return permissions[permission] ?? false;
  };

  return { permissions, groupName, loading, can };
}
