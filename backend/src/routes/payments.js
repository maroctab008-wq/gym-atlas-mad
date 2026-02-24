const express = require('express');
const pool = require('../db/pool');
const { authenticate, attachPermissions } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, attachPermissions);

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, m.full_name as member_full_name
       FROM payments p
       LEFT JOIN members m ON m.id = p.member_id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  const {
    member_id, member_name, subscription_id, amount_mad, amount_due,
    method, cheque_number, invoice_number, installment_plan,
    installment_number, installment_total, date
  } = req.body;

  if (!member_id || !amount_mad || !method) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO payments (member_id, member_name, subscription_id, amount_mad, amount_due,
       method, cheque_number, invoice_number, installment_plan, installment_number, installment_total, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [member_id, member_name, subscription_id, amount_mad, amount_due || 0,
       method, cheque_number || null, invoice_number || null, installment_plan || null,
       installment_number || null, installment_total || null, date || new Date().toISOString().split('T')[0]]
    );

    // Update subscription paid_mad if linked
    if (subscription_id) {
      await pool.query(
        `UPDATE subscriptions SET paid_mad = paid_mad + $1 WHERE id = $2`,
        [amount_mad, subscription_id]
      );
      // Auto-activate if fully paid
      const { rows: sub } = await pool.query(
        'SELECT amount_mad, paid_mad FROM subscriptions WHERE id = $1',
        [subscription_id]
      );
      if (sub.length && sub[0].paid_mad >= sub[0].amount_mad) {
        await pool.query(
          `UPDATE subscriptions SET status = 'active' WHERE id = $1 AND status = 'pending'`,
          [subscription_id]
        );
      }
    }

    await logAudit(req.user.id, 'create', 'payment', rows[0].id, { amount_mad, method });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  const { amount_mad, amount_due, method, cheque_number, date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE payments SET amount_mad=$1, amount_due=$2, method=$3, cheque_number=$4, date=$5
       WHERE id=$6 RETURNING *`,
      [amount_mad, amount_due, method, cheque_number, date, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Paiement non trouvé' });
    await logAudit(req.user.id, 'update', 'payment', req.params.id, { amount_mad });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Paiement non trouvé' });
    await logAudit(req.user.id, 'delete', 'payment', req.params.id, null);
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/next-invoice
router.get('/next-invoice', async (req, res) => {
  try {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows } = await pool.query(
      `SELECT invoice_number FROM payments
       WHERE invoice_number LIKE $1
       ORDER BY invoice_number DESC LIMIT 1`,
      [`${prefix}-%`]
    );
    let next = 1;
    if (rows.length && rows[0].invoice_number) {
      const parts = rows[0].invoice_number.split('-');
      next = parseInt(parts[2] || '0') + 1;
    }
    res.json({ invoice_number: `${prefix}-${String(next).padStart(3, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
