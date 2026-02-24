const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.user.id]
    );
    if (!rows.length || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    req.user.role = 'admin';
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function attachPermissions(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT ur.role, ur.group_id, pg.permissions
       FROM user_roles ur
       LEFT JOIN permission_groups pg ON pg.id = ur.group_id
       WHERE ur.user_id = $1`,
      [req.user.id]
    );
    if (rows.length) {
      req.user.role = rows[0].role;
      req.user.group_id = rows[0].group_id;
      req.user.permissions = rows[0].permissions || {};
    }
    next();
  } catch {
    next();
  }
}

module.exports = { authenticate, requireAdmin, attachPermissions };
