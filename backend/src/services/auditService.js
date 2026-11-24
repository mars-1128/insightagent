import pool from '../db/pool.js';

export async function writeAuditLog({ userId, runId = null, action, riskLevel = 'low', details = {} }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, run_id, action, risk_level, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, runId, action, riskLevel, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('⚠️ Failed to write audit log:', err.message);
  }
}
