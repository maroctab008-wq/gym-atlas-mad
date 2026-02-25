const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id as user_id, u.email, u.full_name, u.status, u.created_at,
              ur.role, ur.group_id, pg.name as group_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN permission_groups pg ON pg.id = ur.group_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/groups
router.get('/groups', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM permission_groups ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (create staff)
router.post('/', async (req, res) => {
  const { email, password, fullName, role, groupId } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id`,
      [email.toLowerCase(), hash, fullName]
    );

    await pool.query(
      `INSERT INTO user_roles (user_id, role, group_id) VALUES ($1, $2, $3)`,
      [rows[0].id, role || 'staff', groupId || null]
    );

    await logAudit(req.user.id, 'create', 'user', rows[0].id, { email, role });
    res.status(201).json({ message: 'Utilisateur créé', userId: rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Cet email existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/group
router.put('/:id/group', async (req, res) => {
  const { groupId } = req.body;
  try {
    await pool.query(
      `UPDATE user_roles SET group_id = $1 WHERE user_id = $2`,
      [groupId || null, req.params.id]
    );
    await logAudit(req.user.id, 'update', 'user_group', req.params.id, { groupId });
    res.json({ message: 'Groupe mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    await logAudit(req.user.id, 'update', 'user_status', req.params.id, { status });
    res.json({ message: `Utilisateur ${status === 'active' ? 'activé' : 'désactivé'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    await logAudit(req.user.id, 'update', 'user_password', req.params.id, null);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    await logAudit(req.user.id, 'delete', 'user', req.params.id, null);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
