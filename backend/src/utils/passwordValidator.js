import { z } from 'zod';

export const PASSWORD_RULES = [
  { id: 'minLength', label: 'Minimum 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'At least one number (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', label: 'At least one special character (!@#$...)', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
  { id: 'noSpaces', label: 'No spaces', test: (pw) => pw.length > 0 && !/\s/.test(pw) }
];

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((pw) => /[A-Z]/.test(pw), 'Password must contain at least one uppercase letter')
  .refine((pw) => /[a-z]/.test(pw), 'Password must contain at least one lowercase letter')
  .refine((pw) => /[0-9]/.test(pw), 'Password must contain at least one number')
  .refine((pw) => /[^A-Za-z0-9\s]/.test(pw), 'Password must contain at least one special character')
  .refine((pw) => !/\s/.test(pw), 'Password cannot contain spaces');

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
