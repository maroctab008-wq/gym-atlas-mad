const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM app_settings ORDER BY key');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/:key
router.put('/:key', requireAdmin, async (req, res) => {
  const { value } = req.body;
  const { key } = req.params;
  try {
    const { rows } = await pool.query(
      `INSERT INTO app_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), req.user.id]
    );
    await logAudit(req.user.id, 'update', 'setting', key, { key });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/reset-database
router.post('/reset-database', requireAdmin, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    // Verify admin password
    const { rows: userRows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!userRows.length) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const valid = await bcrypt.compare(password, userRows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Delete data in correct order (FK constraints)
    const tables = ['access_logs', 'payments', 'audit_logs', 'expenses', 'subscriptions', 'members'];
    const results = {};

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        results[table] = 'cleared';
      } catch (err) {
        results[table] = err.message;
      }
    }

    await logAudit(req.user.id, 'reset', 'database', null, { tables });
    res.json({ message: 'Base réinitialisée', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
