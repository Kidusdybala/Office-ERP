const { query } = require('../config/db');

async function findByBadge(badge) {
  const res = await query(
    'SELECT id, name, badge_number FROM staff WHERE badge_number = $1 AND is_active = true',
    [badge]
  );
  return res.rows[0] || null;
}

async function getAll() {
  const res = await query(
    'SELECT id, name, badge_number, department, is_manager, is_active FROM staff WHERE is_active = true'
  );
  return res.rows;
}

module.exports = { findByBadge, getAll };
