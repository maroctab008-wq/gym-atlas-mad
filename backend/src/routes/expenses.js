const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { category, description, amount_mad, date, receipt_url } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (category, description, amount_mad, date, receipt_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [category, description, amount_mad, date || new Date().toISOString().split('T')[0], receipt_url, req.user.id]
    );
    await logAudit(req.user.id, 'create', 'expense', rows[0].id, { category, amount_mad });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Dépense non trouvée' });
    await logAudit(req.user.id, 'delete', 'expense', req.params.id, null);
    res.json({ message: 'Dépense supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
