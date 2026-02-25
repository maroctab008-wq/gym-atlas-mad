const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/terminal/sync-members
router.get('/sync-members', async (req, res) => {
  try {
    const { rows: settings } = await pool.query(
      "SELECT value FROM app_settings WHERE key = 'access_rules'"
    );
    const daysTolerance = settings.length ? (settings[0].value?.days_tolerance ?? 3) : 3;

    const { rows: members } = await pool.query(
      `SELECT m.id, m.full_name, m.cin,
              s.id as sub_id, s.status as sub_status, s.end_date, s.amount_mad, s.paid_mad
       FROM members m
       LEFT JOIN subscriptions s ON s.member_id = m.id
         AND s.status IN ('active', 'pending')
       ORDER BY m.full_name`
    );

    const now = new Date();
    const result = members.map(m => {
      if (!m.sub_id) {
        return {
          id: m.id, full_name: m.full_name,
          payment_status: 'Aucun abonnement',
          access_status: 'blocked',
          balance_due: 0,
          subscription_status: 'none',
        };
      }

      const endDate = new Date(m.end_date);
      const toleranceDate = new Date(endDate);
      toleranceDate.setDate(toleranceDate.getDate() + daysTolerance);

      const balanceDue = Math.max(0, m.amount_mad - m.paid_mad);
      const isExpired = now > toleranceDate;
      const isPaid = balanceDue === 0;

      let paymentStatus = isPaid ? 'Soldé' : `Reste ${balanceDue} MAD`;
      let accessStatus = 'authorized';

      if (isExpired) {
        accessStatus = 'blocked';
        paymentStatus = 'Expiré';
      } else if (!isPaid && m.sub_status === 'pending') {
        accessStatus = 'blocked';
      }

      return {
        id: m.id, full_name: m.full_name,
        payment_status: paymentStatus,
        access_status: accessStatus,
        balance_due: balanceDue,
        subscription_status: m.sub_status,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terminal/test-connection
router.post('/test-connection', async (req, res) => {
  const { ip, port, username, password } = req.body;
  if (!ip || !port || !username || !password) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    const url = `http://${ip}:${port}/ISAPI/System/deviceInfo`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erreur terminal: ${response.status}` });
    }

    const text = await response.text();
    res.json({ success: true, deviceInfo: text });
  } catch (err) {
    res.status(500).json({ error: `Connexion impossible: ${err.message}` });
  }
});

// POST /api/terminal/sync
router.post('/sync', async (req, res) => {
  const { terminals } = req.body;
  if (!terminals || !terminals.length) {
    return res.status(400).json({ error: 'Aucun terminal configuré' });
  }

  try {
    const { rows: members } = await pool.query(
      `SELECT m.*, s.status as sub_status, s.end_date
       FROM members m
       LEFT JOIN subscriptions s ON s.member_id = m.id AND s.status = 'active'`
    );

    const results = [];
    for (const terminal of terminals) {
      const auth = btoa(`${terminal.username}:${terminal.password}`);
      const baseUrl = `http://${terminal.ip}:${terminal.port}`;

      let synced = 0, errors = 0;
      for (const member of members) {
        try {
          const userData = `<UserInfo><employeeNo>${member.id}</employeeNo><name>${member.full_name}</name><Valid><enable>true</enable><beginTime>${new Date().toISOString()}</beginTime><endTime>${member.sub_status === 'active' ? member.end_date + 'T23:59:59' : new Date().toISOString()}</endTime></Valid></UserInfo>`;
          
          const resp = await fetch(`${baseUrl}/ISAPI/AccessControl/UserInfo/Record?format=json`, {
            method: 'PUT',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/xml',
            },
            body: userData,
            signal: AbortSignal.timeout(10000),
          });

          if (resp.ok) synced++;
          else errors++;
        } catch {
          errors++;
        }
      }
      results.push({ terminal: terminal.name, synced, errors });
    }

    res.json({ results, totalMembers: members.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
