import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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
  view_dashboard_kpis: true, members_add: true, members_edit: true, members_delete: true,
  payments_view: true, payments_create: true, payments_delete: true,
  expenses_view: true, expenses_import: true, access_override: true, settings_access: true,
};

const NO_PERMISSIONS: Permissions = {
  view_dashboard_kpis: false, members_add: false, members_edit: false, members_delete: false,
  payments_view: false, payments_create: false, payments_delete: false,
  expenses_view: false, expenses_import: false, access_override: false, settings_access: false,
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
  const { user } = useAuth();
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

    // Always fetch permissions from group — no role shortcut
    api.get(`/auth/permissions`).then(({ data }) => {
      if (data) {
        setGroupName(data.group_name || null);
        setPermissions({ ...NO_PERMISSIONS, ...(data.permissions as Partial<Permissions>) });
      }
      setLoading(false);
    });
  }, [user]);

  const can = (permission: keyof Permissions) => {
    return permissions[permission] ?? false;
  };

  return { permissions, groupName, loading, can };
}
