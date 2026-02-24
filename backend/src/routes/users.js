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
      `SELECT u.id, u.email, u.full_name, u.status, u.created_at,
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
