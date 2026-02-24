require('dotenv').config();
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Base de données initialisée avec succès');
  } catch (err) {
    console.error('❌ Erreur initialisation DB:', err.message);
  } finally {
    await pool.end();
  }
}

initDatabase();
