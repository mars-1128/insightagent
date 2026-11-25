import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api/client';
import PasswordStrengthChecklist, { evaluatePassword } from '../components/PasswordStrengthChecklist';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setError('Invalid or missing password reset token.');
      return;
    }

    api
      .get('/api/auth/reset-password/verify', { params: { token } })
      .then((res) => {
        if (res.data?.valid) setTokenValid(true);
        else setError('This reset link is invalid or has expired.');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'This reset link is invalid or has expired.');
      })
      .finally(() => setChecking(false));
  }, [token]);

  const passwordEval = evaluatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordEval.allPassed) {
      setError('Please satisfy all password rules before continuing.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-canvas flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a New Password</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Secure your InsightAgent account</p>
          </div>
        </div>

        {checking ? (
          <div className="py-10 text-center space-y-2">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
            <p className="text-xs text-slate-500">Verifying reset link...</p>
          </div>
        ) : done ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Password Updated!
            </div>
            <p>Redirecting you to Login...</p>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error || 'Reset link is invalid or expired.'}</span>
            </div>
            <Link
              to="/forgot-password"
              className="aurora-btn flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-semibold"
            >
              Request a New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-2.5 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <PasswordStrengthChecklist password={password} />

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full px-4 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !passwordEval.allPassed}
              className="aurora-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
