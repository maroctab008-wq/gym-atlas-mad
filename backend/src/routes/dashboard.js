const express = require('express');
const pool = require('../db/pool');
const { authenticate, attachPermissions } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, attachPermissions);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [members, activeSubs, revenue, expenses, todayAccess] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM members'),
      pool.query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`),
      pool.query(`SELECT COALESCE(SUM(amount_mad), 0) as total FROM payments WHERE date >= date_trunc('month', CURRENT_DATE)`),
      pool.query(`SELECT COALESCE(SUM(amount_mad), 0) as total FROM expenses WHERE date >= date_trunc('month', CURRENT_DATE)`),
      pool.query(`SELECT COUNT(*) as count FROM access_logs WHERE timestamp >= CURRENT_DATE`),
    ]);

    const stats = {
      totalMembers: parseInt(members.rows[0].count),
      activeSubscriptions: parseInt(activeSubs.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].total),
      monthlyExpenses: parseFloat(expenses.rows[0].total),
      todayAccessCount: parseInt(todayAccess.rows[0].count),
    };

    // Mask financial data for staff without permission
    if (req.user.role === 'staff') {
      const perms = req.user.permissions || {};
      if (!perms.view_revenue) {
        stats.monthlyRevenue = undefined;
        stats.monthlyExpenses = undefined;
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/recent-payments
router.get('/recent-payments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, m.full_name FROM payments p
       LEFT JOIN members m ON m.id = p.member_id
       ORDER BY p.created_at DESC LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/expiring-subscriptions
router.get('/expiring-subscriptions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, m.full_name FROM subscriptions s
       LEFT JOIN members m ON m.id = s.member_id
       WHERE s.status = 'active' AND s.end_date <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY s.end_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
