import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { strongPasswordSchema, normalizeEmail } from '../utils/passwordValidator.js';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService.js';
import { writeAuditLog } from '../services/auditService.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  email: z.string().trim().email('Please enter a valid email address').max(255),
  password: strongPasswordSchema
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address')
});

const resetSchema = z.object({
  token: z.string().min(32, 'Invalid reset token'),
  password: strongPasswordSchema
});

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getAllowedFrontendOrigin(candidateOrigin) {
  const fallback = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  if (!candidateOrigin) return fallback;
  try {
    const parsed = new URL(candidateOrigin);
    const allowedList = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      allowedList.includes(parsed.origin) ||
      /^http:\/\/localhost:\d+$/.test(parsed.origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(parsed.origin)
    ) {
      return parsed.origin;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function buildGoogleOAuthClient(req) {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  return {
    client: new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    ),
    redirectUri
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      tv: user.token_version ?? 0
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url || null,
    authProvider: user.auth_provider || 'local',
    emailVerified: Boolean(user.email_verified)
  };
}

// GET /api/auth/providers — tells UI which providers are configured
router.get('/providers', (req, res) => {
  res.json({
    emailPassword: true,
    googleConfigured: isGoogleConfigured(),
    resetEmailConfigured: isEmailConfigured()
  });
});

// POST /api/auth/register — Full Name + Email + Strong Password
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const name = parsed.name;

    const existing = await pool.query(
      'SELECT id, auth_provider FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please log in instead.'
      });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, auth_provider, email_verified, token_version)
       VALUES ($1, $2, $3, 'local', FALSE, 0)
       RETURNING id, name, email, avatar_url, auth_provider, email_verified, token_version, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_REGISTER',
      riskLevel: 'low',
      details: { provider: 'local', email }
    });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login — Email + Password
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account was created with Google. Please click "Continue with Google" or use Forgot Password to set a password.'
      });
    }

    const isValid = await bcrypt.compare(parsed.password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const token = generateToken(user);

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN',
      riskLevel: 'low',
      details: { provider: 'local', email }
    });

    res.json({
      message: 'Login successful!',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout — invalidates current JWT server-side
router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.id]);
    await writeAuditLog({
      userId: req.user.id,
      action: 'AUTH_LOGOUT',
      riskLevel: 'low',
      details: {}
    });
    res.json({ message: 'Signed out securely.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_url, auth_provider, email_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: formatUserResponse(result.rows[0]) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
});

// GET /api/auth/google — starts real Google OAuth 2.0 flow
router.get('/google', (req, res) => {
  const origin = getAllowedFrontendOrigin(req.query.origin || req.headers.referer);

  if (!isGoogleConfigured()) {
    return res.redirect(
      `${origin}/login?error=${encodeURIComponent(
        'Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env.'
      )}`
    );
  }

  const { client } = buildGoogleOAuthClient(req);
  const stateToken = jwt.sign(
    {
      nonce: crypto.randomBytes(16).toString('hex'),
      origin
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  const authUrl = client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state: stateToken
  });

  res.redirect(authUrl);
});

// GET /api/auth/google/callback — handles Google's OAuth callback
router.get('/google/callback', async (req, res) => {
  let targetOrigin = getAllowedFrontendOrigin(null);

  try {
    const { code, state, error: oauthError } = req.query;

    if (!state) {
      return res.redirect(`${targetOrigin}/login?error=${encodeURIComponent('Missing OAuth state parameter.')}`);
    }

    let decodedState;
    try {
      decodedState = jwt.verify(String(state), process.env.JWT_SECRET);
      targetOrigin = getAllowedFrontendOrigin(decodedState.origin);
    } catch {
      return res.redirect(`${targetOrigin}/login?error=${encodeURIComponent('Google sign-in session expired. Please try again.')}`);
    }

    if (oauthError) {
      const msg =
        oauthError === 'access_denied'
          ? 'Google sign-in was cancelled.'
          : `Google authentication error: ${oauthError}`;
      return res.redirect(`${targetOrigin}/login?error=${encodeURIComponent(msg)}`);
    }

    if (!code || !isGoogleConfigured()) {
      return res.redirect(`${targetOrigin}/login?error=${encodeURIComponent('Invalid Google OAuth callback.')}`);
    }

    const { client } = buildGoogleOAuthClient(req);
    const { tokens } = await client.getToken(String(code));

    if (!tokens.id_token) {
      return res.redirect(`${targetOrigin}/login?error=${encodeURIComponent('Google did not return an ID token.')}`);
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      return res.redirect(
        `${targetOrigin}/login?error=${encodeURIComponent('Google account must have a verified email address.')}`
      );
    }

    const googleId = payload.sub;
    const email = normalizeEmail(payload.email);
    const fullName = String(payload.name || email.split('@')[0]).trim().slice(0, 100);
    const avatarUrl = payload.picture || null;

    // Look up existing user by google_id or email to prevent duplicate accounts
    const existingRes = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR LOWER(email) = LOWER($2) LIMIT 1',
      [googleId, email]
    );

    let user;
    let isNewUser = false;

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const nextProvider = existing.password_hash ? 'both' : 'google';
      const upd = await pool.query(
        `UPDATE users
         SET google_id = COALESCE(google_id, $1),
             avatar_url = COALESCE($2, avatar_url),
             email_verified = TRUE,
             auth_provider = $3
         WHERE id = $4
         RETURNING *`,
        [googleId, avatarUrl, nextProvider, existing.id]
      );
      user = upd.rows[0];
    } else {
      isNewUser = true;
      const ins = await pool.query(
        `INSERT INTO users (name, email, google_id, avatar_url, auth_provider, email_verified, token_version)
         VALUES ($1, $2, $3, $4, 'google', TRUE, 0)
         RETURNING *`,
        [fullName, email, googleId, avatarUrl]
      );
      user = ins.rows[0];
    }

    // Create single-use 2-minute code so JWT is never exposed in browser URL bar
    const exchangeCode = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO oauth_exchange_codes (code, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '2 minutes')`,
      [exchangeCode, user.id]
    );

    await writeAuditLog({
      userId: user.id,
      action: isNewUser ? 'AUTH_GOOGLE_REGISTER' : 'AUTH_GOOGLE_LOGIN',
      riskLevel: 'low',
      details: { email, provider: user.auth_provider }
    });

    return res.redirect(`${targetOrigin}/auth/google/callback?code=${encodeURIComponent(exchangeCode)}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(
      `${targetOrigin}/login?error=${encodeURIComponent('Google sign-in failed. Please try again.')}`
    );
  }
});

// POST /api/auth/google/exchange — exchanges single-use OAuth code for JWT session
router.post('/google/exchange', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Missing OAuth exchange code.' });
    }

    // Clean expired codes opportunistically
    await pool.query('DELETE FROM oauth_exchange_codes WHERE expires_at <= NOW()');

    const consumed = await pool.query(
      `DELETE FROM oauth_exchange_codes
       WHERE code = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [code]
    );

    if (consumed.rows.length === 0) {
      return res.status(401).json({ error: 'Google sign-in link expired or already used. Please try again.' });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [consumed.rows[0].user_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = userRes.rows[0];
    const token = generateToken(user);

    res.json({
      message: 'Google authentication successful!',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Google exchange error:', error);
    res.status(500).json({ error: 'Failed to complete Google sign-in.' });
  }
});

// POST /api/auth/forgot-password — sends a real time-limited reset link via SMTP
router.post('/forgot-password', async (req, res) => {
  try {
    const parsed = forgotSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);

    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Password reset email delivery is not configured on the server (SMTP_USER / SMTP_PASS missing).'
      });
    }

    const origin = getAllowedFrontendOrigin(req.body?.origin || req.headers.origin || req.headers.referer);

    const userRes = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Invalidate any prior unused reset tokens for this user
      await pool.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [user.id, tokenHash]
      );

      const resetUrl = `${origin}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail({
        toEmail: user.email,
        userName: user.name,
        resetUrl
      });

      await writeAuditLog({
        userId: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        riskLevel: 'medium',
        details: { email: user.email }
      });
    }

    // Generic message prevents email enumeration
    res.json({
      message: 'If an account exists for that email address, a password reset link has been sent (valid for 15 minutes).'
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to send password reset email right now. Please try again.' });
  }
});

// GET /api/auth/reset-password/verify — verifies token validity before displaying reset form
router.get('/reset-password/verify', async (req, res) => {
  try {
    const rawToken = String(req.query?.token || '').trim();
    if (!rawToken || rawToken.length < 32) {
      return res.status(400).json({ valid: false, error: 'Invalid password reset token.' });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const result = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired.' });
    }
    res.json({ valid: true });
  } catch {
    res.status(500).json({ valid: false, error: 'Failed to verify reset link.' });
  }
});

// POST /api/auth/reset-password — validates token + strong password, updates password & invalidates old JWTs
router.post('/reset-password', async (req, res) => {
  const client = await pool.connect();
  try {
    const parsed = resetSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(parsed.token).digest('hex');

    await client.query('BEGIN');

    const tokenRes = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    }

    const { id: tokenId, user_id: userId } = tokenRes.rows[0];
    const passwordHash = await bcrypt.hash(parsed.password, 12);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           token_version = token_version + 1,
           auth_provider = CASE WHEN auth_provider = 'google' THEN 'both' ELSE auth_provider END
       WHERE id = $2`,
      [passwordHash, userId]
    );

    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);
    await client.query('COMMIT');

    await writeAuditLog({
      userId,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      riskLevel: 'medium',
      details: {}
    });

    res.json({ message: 'Password updated successfully! You can now log in with your new password.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  } finally {
    client.release();
  }
});

export default router;
