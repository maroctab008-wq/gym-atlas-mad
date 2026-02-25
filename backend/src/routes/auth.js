const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.*, ur.role FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = $1 AND u.status = 'active'`,
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.status, ur.role, ur.group_id
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/permissions — retourne les permissions du user connecté (pour staff)
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ur.role, ur.group_id, pg.name as group_name, pg.permissions
       FROM user_roles ur
       LEFT JOIN permission_groups pg ON pg.id = ur.group_id
       WHERE ur.user_id = $1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({ role: 'staff', group_name: null, permissions: {} });
    }

    const row = rows[0];

    // Admin = toutes les permissions
    if (row.role === 'admin') {
      return res.json({
        role: 'admin',
        group_name: 'Administrateur',
        permissions: {
          view_dashboard_kpis: true, members_add: true, members_edit: true, members_delete: true,
          payments_view: true, payments_create: true, payments_delete: true,
          expenses_view: true, expenses_import: true, access_override: true, settings_access: true,
        }
      });
    }

    // Staff avec groupe = permissions du groupe
    // Staff sans groupe = permissions par défaut (lecture seule)
    const defaultStaffPerms = {
      view_dashboard_kpis: false, members_add: true, members_edit: true, members_delete: false,
      payments_view: true, payments_create: true, payments_delete: false,
      expenses_view: true, expenses_import: false, access_override: false, settings_access: false,
    };

    res.json({
      role: row.role,
      group_name: row.group_name || 'Staff (défaut)',
      permissions: row.permissions || defaultStaffPerms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/check-admin — vérifie si le compte admin est correctement configuré
router.get('/check-admin', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.status, ur.role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = 'admin@admin.com'`
    );

    if (!rows.length) {
      return res.json({
        exists: false,
        message: "Le compte admin@admin.com n'existe pas. Exécutez le script fix-admin.sql."
      });
    }

    const admin = rows[0];
    const issues = [];
    if (admin.status !== 'active') issues.push(`Statut actuel: "${admin.status}" (devrait être "active")`);
    if (admin.role !== 'admin') issues.push(`Rôle actuel: "${admin.role || 'aucun'}" (devrait être "admin")`);

    res.json({
      exists: true,
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      status: admin.status,
      role: admin.role || 'aucun',
      ok: issues.length === 0,
      issues,
      message: issues.length === 0
        ? '✅ Le compte admin est correctement configuré.'
        : `⚠️ Problèmes détectés: ${issues.join('; ')}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-change-password (admin only)
router.post('/admin-change-password', authenticate, requireAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Champs invalides' });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
