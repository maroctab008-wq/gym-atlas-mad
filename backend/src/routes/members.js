const express = require('express');
const pool = require('../db/pool');
const { authenticate, attachPermissions } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, attachPermissions);

// GET /api/members
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Membre non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members
router.post('/', async (req, res) => {
  const { full_name, phone, cin, date_of_birth, gender, qr_code, photo_url } = req.body;
  if (!full_name || !phone || !cin || !date_of_birth || !qr_code) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO members (full_name, phone, cin, date_of_birth, gender, qr_code, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [full_name, phone, cin, date_of_birth, gender || 'Homme', qr_code, photo_url || null]
    );
    await logAudit(req.user.id, 'create', 'member', rows[0].id, { full_name });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:id
router.put('/:id', async (req, res) => {
  const { full_name, phone, cin, date_of_birth, gender, photo_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE members SET full_name=$1, phone=$2, cin=$3, date_of_birth=$4, gender=$5, photo_url=$6
       WHERE id=$7 RETURNING *`,
      [full_name, phone, cin, date_of_birth, gender, photo_url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Membre non trouvé' });
    await logAudit(req.user.id, 'update', 'member', req.params.id, { full_name });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
  try {
    // Check for active subscriptions
    const { rows: subs } = await pool.query(
      `SELECT id FROM subscriptions WHERE member_id = $1 AND status IN ('active', 'pending')`,
      [req.params.id]
    );
    if (subs.length) {
      return res.status(400).json({ error: 'Impossible de supprimer: le membre a un abonnement actif ou en attente' });
    }

    const { rowCount } = await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Membre non trouvé' });
    await logAudit(req.user.id, 'delete', 'member', req.params.id, null);
    res.json({ message: 'Membre supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/import
router.post('/import', async (req, res) => {
  const { members } = req.body;
  if (!members || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'Aucun membre à importer' });
  }

  try {
    let imported = 0;
    const errors = [];

    for (const m of members) {
      try {
        const qrCode = m.cin || `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
        await pool.query(
          `INSERT INTO members (full_name, phone, cin, date_of_birth, gender, qr_code)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [m.full_name, m.phone || '0000000000', m.cin || qrCode, m.date_of_birth || '2000-01-01', m.gender || 'Homme', qrCode]
        );
        imported++;
      } catch (err) {
        errors.push({ name: m.full_name, error: err.message });
      }
    }

    await logAudit(req.user.id, 'import', 'member', null, { count: imported, errors: errors.length });
    res.json({ message: `${imported} membres importés`, imported, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/search/:query
router.get('/search/:query', async (req, res) => {
  try {
    const q = `%${req.params.query}%`;
    const { rows } = await pool.query(
      `SELECT * FROM members WHERE full_name ILIKE $1 OR cin ILIKE $1 OR phone ILIKE $1 ORDER BY full_name`,
      [q]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
