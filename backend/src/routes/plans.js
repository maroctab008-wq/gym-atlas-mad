const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/plans
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plan_configs ORDER BY months ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plans (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { label, months, price_mad, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO plan_configs (label, months, price_mad, is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [label, months, price_mad, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/plans/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { label, months, price_mad, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE plan_configs SET label=$1, months=$2, price_mad=$3, is_active=$4 WHERE id=$5 RETURNING *`,
      [label, months, price_mad, is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plans/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM plan_configs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Plan non trouvé' });
    res.json({ message: 'Plan supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
