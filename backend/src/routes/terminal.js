const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

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
