import nodemailer from 'nodemailer';

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('SMTP email service is not configured on the server.');
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendPasswordResetEmail({ toEmail, userName, resetUrl }) {
  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || `"InsightAgent Security" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'Reset your InsightAgent password (expires in 15 minutes)',
    text: [
      `Hi ${userName || 'there'},`,
      '',
      'We received a request to reset your InsightAgent password.',
      'Open the link below within 15 minutes to choose a new password:',
      resetUrl,
      '',
      'If you did not request this reset, you can safely ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0b1022; color: #e2e8f0; border-radius: 16px; border: 1px solid #1e293b;">
        <h2 style="margin: 0 0 12px; color: #ffffff;">Reset Your InsightAgent Password</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Hi ${String(userName || 'there').replace(/[<>&]/g, '')},<br/><br/>
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
    `
  });
}
