/**
 * Supabase-backed API layer.
 * Translates Express-style route calls to Supabase client queries.
 * This allows all existing components to work without modification.
 */
import { supabase } from '@/integrations/supabase/client';

// Legacy compat — no-ops since Supabase handles tokens via session
export function setToken(_token: string) {}
export function clearToken() {}

type ApiResult<T = any> = { data: T | null; error: string | null };

function ok<T>(data: T): ApiResult<T> { return { data, error: null }; }
function err(msg: string): ApiResult { return { data: null, error: msg }; }

function parseId(path: string): string | null {
  const parts = path.split('/');
  // /resource/:id or /resource/:id/action
  if (parts.length >= 3) {
    const id = parts[2];
    // UUID pattern
    if (id && id.length > 8) return id;
  }
  return null;
}

// ---- Route handlers ----

async function handleGet(path: string): Promise<ApiResult> {
  // Members
  if (path === '/members') {
    const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    return error ? err(error.message) : ok(data);
  }

  // Plans
  if (path === '/plans') {
    const { data, error } = await supabase.from('plan_configs').select('*').eq('is_active', true).order('months');
    return error ? err(error.message) : ok(data);
  }

  // Payments
  if (path === '/payments') {
    const { data, error } = await supabase.from('payments').select('*, members(full_name, cin)').order('date', { ascending: false });
    return error ? err(error.message) : ok(data);
  }

  // Expenses
  if (path === '/expenses') {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return error ? err(error.message) : ok(data);
  }

  // Subscriptions
  if (path === '/subscriptions') {
    const { data, error } = await supabase.from('subscriptions').select('*, members(full_name)').order('created_at', { ascending: false });
    return error ? err(error.message) : ok(data);
  }

  // Subscription by ID
  if (path.startsWith('/subscriptions/') && !path.includes('by-member') && !path.includes('check-duplicate') && !path.includes('notifications')) {
    const id = path.split('/')[2];
    const { data, error } = await supabase.from('subscriptions').select('*').eq('id', id).maybeSingle();
    return error ? err(error.message) : ok(data);
  }

  // Subscriptions by member
  if (path.startsWith('/subscriptions/by-member/')) {
    const memberId = path.split('/')[3];
    const { data, error } = await supabase.from('subscriptions').select('*').eq('member_id', memberId).order('end_date', { ascending: false });
    return error ? err(error.message) : ok(data);
  }

  // Subscription duplicate check
  if (path.startsWith('/subscriptions/check-duplicate/')) {
    const memberId = path.split('/')[3];
    const { data } = await supabase.from('subscriptions').select('id').eq('member_id', memberId).in('status', ['active', 'pending']).limit(1);
    return ok({ duplicate: (data && data.length > 0) });
  }

  // Subscription notifications (expired/near-expiry)
  if (path === '/subscriptions/notifications') {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, plan, end_date, status, member_id, members(full_name)')
      .in('status', ['active', 'expired'])
      .order('end_date', { ascending: true });

    const now = new Date();
    const notifications = (subs || [])
      .map(s => {
        const endDate = new Date(s.end_date);
        const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue < -3) return null; // not yet near expiry
        return {
          id: s.id,
          memberId: s.member_id,
          memberName: (s.members as any)?.full_name || '—',
          plan: s.plan,
          daysOverdue: Math.max(0, daysOverdue),
          endDate: s.end_date,
        };
      })
      .filter(Boolean);

    return ok(notifications);
  }

  // Dashboard endpoints
  if (path === '/dashboard/payments') {
    const { data, error } = await supabase.from('payments').select('*, members(full_name)').order('date', { ascending: false });
    return error ? err(error.message) : ok(data);
  }
  if (path === '/dashboard/expenses') {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return error ? err(error.message) : ok(data);
  }
  if (path === '/dashboard/subscriptions') {
    const { data, error } = await supabase.from('subscriptions').select('*, members(full_name)').order('created_at', { ascending: false });
    return error ? err(error.message) : ok(data);
  }
  if (path === '/dashboard/access-logs') {
    const { data, error } = await supabase.from('access_logs').select('*').order('timestamp', { ascending: false }).limit(500);
    return error ? err(error.message) : ok(data);
  }

  // Settings
  if (path === '/settings') {
    const { data, error } = await supabase.from('app_settings').select('*');
    return error ? err(error.message) : ok(data);
  }
  if (path.startsWith('/settings/')) {
    const key = path.split('/')[2];
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
    return error ? err(error.message) : ok(data?.value || null);
  }

  // Users
  if (path === '/users') {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, status'),
      supabase.from('user_roles').select('user_id, role, group_id, permission_groups(name)'),
    ]);
    if (profilesRes.error) return err(profilesRes.error.message);
    const users = (profilesRes.data || []).map(p => {
      const roleInfo = (rolesRes.data || []).find(r => r.user_id === p.user_id);
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        status: p.status,
        role: roleInfo?.role || 'staff',
        group_id: roleInfo?.group_id || null,
        group_name: (roleInfo?.permission_groups as any)?.name || null,
      };
    });
    return ok(users);
  }

  // Permission groups
  if (path === '/users/groups') {
    const { data, error } = await supabase.from('permission_groups').select('*').order('created_at');
    return error ? err(error.message) : ok(data);
  }

  // Auth permissions
  if (path === '/auth/permissions') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('Non autorisé');

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, group_id, permission_groups(name, permissions)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData) return ok({ group_name: null, permissions: {} });

    const pg = roleData.permission_groups as any;
    return ok({
      group_name: pg?.name || null,
      permissions: pg?.permissions || {},
    });
  }

  // Auth me
  if (path === '/auth/me') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('Non autorisé');
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    const { data: roleData } = await supabase.from('user_roles').select('role, group_id').eq('user_id', user.id).maybeSingle();
    return ok({
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || '',
      status: profile?.status || 'active',
      role: roleData?.role || 'staff',
      group_id: roleData?.group_id || null,
    });
  }

  // Audit logs
  if (path === '/audit') {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return err(error.message);
    // Enrich with user info
    const userIds = [...new Set((data || []).map(l => l.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched = (data || []).map(l => ({
      ...l,
      user_name: profileMap.get(l.user_id)?.full_name || null,
      user_email: profileMap.get(l.user_id)?.email || null,
    }));
    return ok(enriched);
  }

  // Payments members-with-subs (just return members for the dropdown)
  if (path === '/payments/members-with-subs') {
    const { data, error } = await supabase.from('members').select('id, full_name, cin').order('full_name');
    return error ? err(error.message) : ok(data);
  }

  // Terminal sync-members
  if (path === '/terminal/sync-members') {
    const [membersRes, subsRes, settingsRes] = await Promise.all([
      supabase.from('members').select('id, full_name'),
      supabase.from('subscriptions').select('member_id, status, amount_mad, paid_mad, end_date'),
      supabase.from('app_settings').select('value').eq('key', 'access_rules').maybeSingle(),
    ]);
    const tolerance = (settingsRes.data?.value as any)?.days_tolerance ?? 3;
    const now = new Date();
    const members = (membersRes.data || []).map(m => {
      const memberSubs = (subsRes.data || []).filter(s => s.member_id === m.id);
      const latestSub = memberSubs.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
      if (!latestSub) {
        return { id: m.id, full_name: m.full_name, payment_status: 'Aucun abonnement', access_status: 'blocked', balance_due: 0, subscription_status: 'none' };
      }
      const endDate = new Date(latestSub.end_date);
      const daysSinceExpiry = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      const balance = Math.max(0, latestSub.amount_mad - latestSub.paid_mad);
      const paymentStatus = balance > 0 ? `Reste: ${balance} MAD` : 'Soldé';
      let accessStatus: 'authorized' | 'blocked' = 'authorized';
      if (latestSub.status === 'expired' && daysSinceExpiry > tolerance) accessStatus = 'blocked';
      if (latestSub.status !== 'active' && latestSub.status !== 'expired') accessStatus = 'blocked';
      if (latestSub.status === 'expired' && daysSinceExpiry <= tolerance) accessStatus = 'authorized';
      return { id: m.id, full_name: m.full_name, payment_status: paymentStatus, access_status: accessStatus, balance_due: balance, subscription_status: latestSub.status };
    });
    return ok(members);
  }

  // Auth check-admin
  if (path === '/auth/check-admin') {
    return ok({ exists: true, ok: true, message: '✅ Utilisation de Lovable Cloud' });
  }

  console.warn('[api] Unhandled GET:', path);
  return err(`Route non gérée: GET ${path}`);
}

async function handlePost(path: string, body?: any): Promise<ApiResult> {
  // Auth login (handled by useAuth, but keep for compat)
  if (path === '/auth/login') {
    const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error) return err(error.message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('Erreur de connexion');
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    return ok({ token: 'supabase-session', user: { id: user.id, email: user.email, full_name: profile?.full_name || '', role: roleData?.role || 'staff' } });
  }

  // Members
  if (path === '/members') {
    const qrCode = `GYM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data, error } = await supabase.from('members').insert({ ...body, qr_code: qrCode, gender: body.gender || 'homme' }).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Members import
  if (path === '/members/import') {
    const rows = (body.members || []).map((m: any) => ({
      ...m,
      qr_code: `GYM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      gender: m.gender || 'homme',
    }));
    const { error } = await supabase.from('members').insert(rows);
    return error ? err(error.message) : ok({ imported: rows.length });
  }

  // Payments
  if (path === '/payments') {
    const invoiceNumber = `FAC-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    let amountDue = 0;

    // Calculate amount_due if linked to subscription
    if (body.subscription_id) {
      const { data: sub } = await supabase.from('subscriptions').select('amount_mad, paid_mad').eq('id', body.subscription_id).maybeSingle();
      if (sub) {
        amountDue = Math.max(0, sub.amount_mad - sub.paid_mad - (body.amount_mad || 0));
        // Update subscription paid_mad
        await supabase.from('subscriptions').update({ paid_mad: sub.paid_mad + (body.amount_mad || 0) }).eq('id', body.subscription_id);
      }
    }

    const { data, error } = await supabase.from('payments').insert({
      ...body,
      invoice_number: invoiceNumber,
      amount_due: amountDue,
    }).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Expenses
  if (path === '/expenses') {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('expenses').insert({ ...body, created_by: user?.id }).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Subscriptions
  if (path === '/subscriptions') {
    const { data, error } = await supabase.from('subscriptions').insert(body).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Users (create via edge function)
  if (path === '/users') {
    const { data, error } = await supabase.functions.invoke('create-staff-user', { body });
    if (error) return err(error.message);
    if (data?.error) return err(data.error);
    return ok(data);
  }

  // Permission groups
  if (path === '/users/groups') {
    const { data, error } = await supabase.from('permission_groups').insert(body).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Access logs scan
  if (path === '/access-logs/scan') {
    const barcode = body.barcode?.trim();
    if (!barcode) return err('Code-barres vide');

    const { data: member } = await supabase.from('members').select('*').eq('qr_code', barcode).maybeSingle();
    if (!member) return ok({ status: 'expired', memberName: 'Inconnu', message: 'Code-barres non reconnu' });

    const { data: subs } = await supabase.from('subscriptions').select('*').eq('member_id', member.id).order('end_date', { ascending: false }).limit(1);
    const sub = subs?.[0];

    const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'access_rules').maybeSingle();
    const daysTolerance = (settings?.value as any)?.days_tolerance ?? 3;

    const { data: { user } } = await supabase.auth.getUser();

    if (!sub) {
      await supabase.from('access_logs').insert({ member_id: member.id, status: 'denied', balance_due_mad: 0, authorized_by: user?.id });
      return ok({ status: 'expired', memberName: member.full_name, message: 'Aucun abonnement trouvé' });
    }

    const endDate = new Date(sub.end_date);
    const now = new Date();
    const daysSinceExpiry = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    const hasBalance = sub.paid_mad < sub.amount_mad;
    const remaining = sub.amount_mad - sub.paid_mad;

    let status: string, message: string, balanceDue: number | undefined, logStatus: string;

    if (sub.status === 'active' && !hasBalance) {
      status = 'granted'; message = `Abonnement actif — ${sub.plan}`; logStatus = 'authorized';
    } else if (daysSinceExpiry > daysTolerance) {
      status = 'expired'; message = `Abonnement expiré depuis ${daysSinceExpiry} jours`; logStatus = 'denied';
    } else if (hasBalance && (sub.status === 'active' || daysSinceExpiry <= daysTolerance)) {
      status = 'balance_due'; message = `Solde dû: ${remaining} MAD`; balanceDue = remaining; logStatus = 'tolerance';
    } else if (daysSinceExpiry > 0 && daysSinceExpiry <= daysTolerance) {
      status = 'balance_due'; message = `Expiré depuis ${daysSinceExpiry}j (tolérance: ${daysTolerance}j)`; logStatus = 'tolerance';
    } else {
      status = 'granted'; message = `Abonnement actif — ${sub.plan}`; logStatus = 'authorized';
    }

    await supabase.from('access_logs').insert({ member_id: member.id, status: logStatus, balance_due_mad: balanceDue || 0, authorized_by: user?.id });

    return ok({ status, memberName: member.full_name, message, balanceDue });
  }

  // Terminal test connection
  if (path === '/terminal/test-connection') {
    const { data, error } = await supabase.functions.invoke('terminal-test-connection', { body });
    if (error) return err(error.message);
    return ok(data);
  }

  // Terminal sync
  if (path === '/terminal/sync') {
    const { data, error } = await supabase.functions.invoke('terminal-sync', { body });
    if (error) return err(error.message);
    return ok(data);
  }

  // Settings reset-database
  if (path === '/settings/reset-database') {
    const { data, error } = await supabase.functions.invoke('reset-database', { body });
    if (error) return err(error.message);
    return ok(data);
  }

  console.warn('[api] Unhandled POST:', path);
  return err(`Route non gérée: POST ${path}`);
}

async function handlePut(path: string, body?: any): Promise<ApiResult> {
  // Members
  if (path.startsWith('/members/')) {
    const id = path.split('/')[2];
    const { data, error } = await supabase.from('members').update(body).eq('id', id).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Payments
  if (path.startsWith('/payments/')) {
    const id = path.split('/')[2];

    // If updating amount and linked to subscription, update sub too
    if (body.amount_mad && body.amount_due !== undefined) {
      const { data: payment } = await supabase.from('payments').select('subscription_id, amount_mad').eq('id', id).maybeSingle();
      if (payment?.subscription_id) {
        const addedAmount = body.amount_mad - payment.amount_mad;
        if (addedAmount > 0) {
          const { data: sub } = await supabase.from('subscriptions').select('paid_mad').eq('id', payment.subscription_id).maybeSingle();
          if (sub) {
            await supabase.from('subscriptions').update({ paid_mad: sub.paid_mad + addedAmount }).eq('id', payment.subscription_id);
          }
        }
      }
    }

    const { data, error } = await supabase.from('payments').update(body).eq('id', id).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Subscriptions
  if (path.startsWith('/subscriptions/')) {
    const id = path.split('/')[2];
    const { reason, ...updateData } = body;
    const { data, error } = await supabase.from('subscriptions').update(updateData).eq('id', id).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Plans
  if (path.startsWith('/plans/')) {
    const id = path.split('/')[2];
    const { data, error } = await supabase.from('plan_configs').update(body).eq('id', id).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Settings
  if (path.startsWith('/settings/')) {
    const key = path.split('/')[2];
    const { data: { user } } = await supabase.auth.getUser();
    const value = body.value || body;
    const { data, error } = await supabase.from('app_settings').upsert(
      { key, value, updated_by: user?.id },
      { onConflict: 'key' }
    ).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Users group
  if (path.match(/^\/users\/[^/]+\/group$/)) {
    const userId = path.split('/')[2];
    const { error } = await supabase.from('user_roles').update({ group_id: body.groupId }).eq('user_id', userId);
    return error ? err(error.message) : ok({ message: 'Groupe mis à jour' });
  }

  // Users status
  if (path.match(/^\/users\/[^/]+\/status$/)) {
    const userId = path.split('/')[2];
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
      body: { action: 'toggle_status', userId, status: body.status },
    });
    if (error) return err(error.message);
    if (data?.error) return err(data.error);
    return ok(data);
  }

  // Users password
  if (path.match(/^\/users\/[^/]+\/password$/)) {
    const userId = path.split('/')[2];
    const { data, error } = await supabase.functions.invoke('admin-change-password', {
      body: { userId, newPassword: body.newPassword },
    });
    if (error) return err(error.message);
    if (data?.error) return err(data.error);
    return ok(data);
  }

  // Permission groups
  if (path.startsWith('/users/groups/')) {
    const id = path.split('/')[3];
    const { data, error } = await supabase.from('permission_groups').update(body).eq('id', id).select().single();
    return error ? err(error.message) : ok(data);
  }

  // Auth change-password (own password)
  if (path === '/auth/change-password') {
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    return error ? err(error.message) : ok({ message: 'Mot de passe modifié avec succès' });
  }

  console.warn('[api] Unhandled PUT:', path);
  return err(`Route non gérée: PUT ${path}`);
}

async function handleDelete(path: string): Promise<ApiResult> {
  // Members
  if (path.startsWith('/members/')) {
    const id = path.split('/')[2];
    const { error } = await supabase.from('members').delete().eq('id', id);
    return error ? err(error.message) : ok({ deleted: true });
  }

  // Payments
  if (path.startsWith('/payments/')) {
    const id = path.split('/')[2];
    const { error } = await supabase.from('payments').delete().eq('id', id);
    return error ? err(error.message) : ok({ deleted: true });
  }

  // Subscriptions (may include ?deletePayments=true)
  if (path.startsWith('/subscriptions/')) {
    const [pathPart, queryStr] = path.split('?');
    const id = pathPart.split('/')[2];
    const params = new URLSearchParams(queryStr || '');
    const deletePayments = params.get('deletePayments') === 'true';

    if (deletePayments) {
      await supabase.from('payments').delete().eq('subscription_id', id);
    }

    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    return error ? err(error.message) : ok({ deleted: true });
  }

  // Users delete
  if (path.startsWith('/users/')) {
    const userId = path.split('/')[2];
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
      body: { action: 'delete_user', userId },
    });
    if (error) return err(error.message);
    if (data?.error) return err(data.error);
    return ok(data);
  }

  console.warn('[api] Unhandled DELETE:', path);
  return err(`Route non gérée: DELETE ${path}`);
}

async function handlePatch(path: string, body?: any): Promise<ApiResult> {
  // Treat PATCH same as PUT
  return handlePut(path, body);
}

export const api = {
  get: <T = any>(path: string) => handleGet(path) as Promise<ApiResult<T>>,
  post: <T = any>(path: string, body?: any) => handlePost(path, body) as Promise<ApiResult<T>>,
  put: <T = any>(path: string, body?: any) => handlePut(path, body) as Promise<ApiResult<T>>,
  patch: <T = any>(path: string, body?: any) => handlePatch(path, body) as Promise<ApiResult<T>>,
  delete: <T = any>(path: string) => handleDelete(path) as Promise<ApiResult<T>>,
};
