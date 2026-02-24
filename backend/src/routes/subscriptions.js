const express = require('express');
const pool = require('../db/pool');
const { authenticate, attachPermissions } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, attachPermissions);

// GET /api/subscriptions
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, m.full_name as member_full_name
       FROM subscriptions s
       LEFT JOIN members m ON m.id = s.member_id
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Abonnement non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  const { member_id, member_name, plan, start_date, end_date, amount_mad, paid_mad, status } = req.body;
  if (!member_id || !plan || !start_date || !end_date || amount_mad == null) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    // Anti-doublon: check for active/pending subscription
    const { rows: existing } = await pool.query(
      `SELECT id FROM subscriptions WHERE member_id = $1 AND status IN ('active', 'pending')`,
      [member_id]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'Ce membre a déjà un abonnement actif ou en attente' });
    }

    const { rows } = await pool.query(
      `INSERT INTO subscriptions (member_id, member_name, plan, start_date, end_date, amount_mad, paid_mad, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [member_id, member_name, plan, start_date, end_date, amount_mad, paid_mad || 0, status || 'pending']
    );
    await logAudit(req.user.id, 'create', 'subscription', rows[0].id, { member_name, plan });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  const { plan, start_date, end_date, amount_mad, paid_mad, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE subscriptions SET plan=$1, start_date=$2, end_date=$3, amount_mad=$4, paid_mad=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [plan, start_date, end_date, amount_mad, paid_mad, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Abonnement non trouvé' });
    await logAudit(req.user.id, 'update', 'subscription', req.params.id, { plan, status });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM subscriptions WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Abonnement non trouvé' });
    await logAudit(req.user.id, 'delete', 'subscription', req.params.id, null);
    res.json({ message: 'Abonnement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/member/:memberId
router.get('/member/:memberId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE member_id = $1 ORDER BY created_at DESC',
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
