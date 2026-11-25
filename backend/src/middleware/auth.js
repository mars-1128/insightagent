import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and token_version has not been invalidated (e.g. via logout or password reset)
    const result = await pool.query(
      'SELECT id, email, name, token_version FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account not found. Please log in again.' });
    }
    const dbUser = result.rows[0];
    if (typeof decoded.tv === 'number' && dbUser.token_version !== decoded.tv) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      tv: dbUser.token_version
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}
