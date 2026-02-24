const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/access-logs
router.get('/', async (req, res) => {
  const { limit = 100 } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT a.*, m.full_name as member_name
       FROM access_logs a
       LEFT JOIN members m ON m.id = a.member_id
       ORDER BY a.timestamp DESC
       LIMIT $1`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/access-logs
router.post('/', async (req, res) => {
  const { member_id, status, balance_due_mad } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO access_logs (member_id, status, balance_due_mad, authorized_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [member_id, status, balance_due_mad || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
