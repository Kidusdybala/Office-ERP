const { query } = require('../config/db');

async function create(staffId, timestamp, punchType, source = 'device') {
  const res = await query(
    `INSERT INTO punches (staff_id, timestamp, punch_type, source)
     VALUES ($1, to_timestamp($2 / 1000.0), $3, $4)
     RETURNING id, staff_id, timestamp, punch_type, source`,
    [staffId, timestamp, punchType, source]
  );
  return res.rows[0];
}

async function getByStaffAndDay(staffId, dateStr) {
  const res = await query(
    `SELECT id, timestamp, punch_type, source
     FROM punches
     WHERE staff_id = $1 AND DATE(timestamp) = $2
     ORDER BY timestamp ASC`,
    [staffId, dateStr]
  );
  return res.rows;
}

module.exports = { create, getByStaffAndDay };
