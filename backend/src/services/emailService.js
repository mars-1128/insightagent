import nodemailer from 'nodemailer';

export function isHttpsEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isEmailConfigured() {
  return isHttpsEmailConfigured() || isSmtpConfigured();
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function buildResetEmailContent({ userName, resetUrl }) {
  const safeName = String(userName || 'there').replace(/[<>&]/g, '');
  const subject = 'Reset your InsightAgent password (expires in 15 minutes)';
  const text = [
    `Hi ${safeName},`,
    '',
    'We received a request to reset your InsightAgent password.',
    'Open the link below within 15 minutes to choose a new password:',
    resetUrl,
    '',
    'If you did not request this reset, you can safely ignore this email.'
  ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0b1022; color: #e2e8f0; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="margin: 0 0 12px; color: #ffffff;">Reset Your InsightAgent Password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Hi ${safeName},<br/><br/>
        We received a request to reset the password for your InsightAgent account. Click the button below within <strong>15 minutes</strong> to set a new password:
      </p>
      <div style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 22px; background: linear-gradient(90deg, #4f46e5, #06b6d4); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        Or paste this link into your browser:<br/>${resetUrl}
      </p>
      <hr style="border: none; border-top: 1px solid #1e293b; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  return { subject, text, html };
}

async function sendViaBrevo({ toEmail, userName, subject, text, html }) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL or SMTP_USER is required when using Brevo.');
  }
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'InsightAgent Security', email: senderEmail },
      to: [{ email: toEmail, name: userName || toEmail }],
      subject,
      htmlContent: html,
      textContent: text
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo API error (${resp.status}): ${errText.slice(0, 180)}`);
  }
}

async function sendViaResend({ toEmail, subject, text, html }) {
  const from = process.env.RESEND_FROM || 'InsightAgent Security <onboarding@resend.dev>';
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Resend API error (${resp.status}): ${errText.slice(0, 180)}`);
  }
}

export async function sendPasswordResetEmail({ toEmail, userName, resetUrl }) {
  if (!isEmailConfigured()) {
    throw new Error('Email delivery service is not configured on the server.');
  }

  const content = buildResetEmailContent({ userName, resetUrl });

  // Prefer HTTPS port 443 providers (required on Render Free tier which blocks outbound SMTP ports)
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ toEmail, userName, ...content });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ toEmail, ...content });
    return;
  }

  // Fallback to SMTP (works locally; Render free tier blocks outbound SMTP 465/587)
  try {
    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || `"InsightAgent Security" <${process.env.SMTP_USER}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: content.subject,
      text: content.text,
      html: content.html
    });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('econnrefused') || msg.includes('enetunreach')) {
      const blockedErr = new Error(
        'SMTP connection timed out (outbound SMTP ports 465/587 are blocked on Render Free tier). Add a free BREVO_API_KEY (HTTPS port 443) to Render Environment Variables.'
      );
      blockedErr.status = 503;
      throw blockedErr;
    }
    throw err;
  }
}
