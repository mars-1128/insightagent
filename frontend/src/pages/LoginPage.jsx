import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  BarChart3,
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/client';
import PasswordStrengthChecklist, { evaluatePassword } from '../components/PasswordStrengthChecklist';

function GoogleLogo() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export default function LoginPage({ defaultMode = 'login' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIsRegister =
    defaultMode === 'register' || searchParams.get('mode') === 'register';

  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => searchParams.get('error') || '');
  const [submitting, setSubmitting] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsRegister(defaultMode === 'register' || searchParams.get('mode') === 'register');
  }, [defaultMode, searchParams]);

  useEffect(() => {
    if (user) navigate('/studio', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api
      .get('/api/auth/providers')
      .then((res) => setGoogleConfigured(Boolean(res.data?.googleConfigured)))
      .catch(() => {});
  }, []);

  const passwordEval = evaluatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isRegister) {
      if (name.trim().length < 2) {
        setError('Full name must be at least 2 characters.');
        return;
      }
      if (!passwordEval.allPassed) {
        setError('Please meet all password requirements shown in the checklist below.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name.trim(), cleanEmail, password);
      } else {
        await login(cleanEmail, password);
      }
      navigate('/studio');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = () => {
    setError('');
    if (!googleConfigured) {
      setError(
        'Google OAuth is not configured on the backend yet (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'
      );
      return;
    }
    const base = API_BASE_URL || '';
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${base}/api/auth/google?origin=${origin}`;
  };

  const switchMode = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    setPassword('');
    setSearchParams(registerMode ? { mode: 'register' } : {});
  };

  return (
    <div className="glass-canvas flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 lg:grid-cols-2 overflow-hidden glass-panel animate-fade-up">
        {/* Left Observatory Pitch */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-500/20 p-10 border-r border-slate-200/70 dark:border-cyan-400/10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline dark:text-emerald-300 mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Overview
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/30">
                <BarChart3 className="h-6 w-6 stroke-[2.3]" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Insight<span className="text-emerald-600 dark:text-emerald-400">Agent</span>
                </h1>
                <p className="font-mono text-[11px] text-teal-600 dark:text-cyan-300">Autonomous Data Observatory</p>
              </div>
            </div>

            <h2 className="mt-10 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white">
              Talk to your data like a colleague, not a database.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Sign in securely with Email &amp; Password or Google OAuth to upload datasets, review editable execution plans, and generate verified PostgreSQL insights.
            </p>
          </div>

          <div className="space-y-3 pt-8">
            {[
              { icon: BarChart3, text: 'Editable plans, live tool traces & interactive charts' },
              { icon: ShieldCheck, text: 'Strict read-only SQL sandbox + human approval gates' },
              { icon: Lock, text: 'Bcrypt password hashing + verified Google OAuth sessions' }
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="glass-panel-subtle flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200">
                <Icon className="h-4 w-4 text-cyan-500 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="p-7 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">InsightAgent</span>
            </div>
            <Link to="/" className="text-xs font-semibold text-indigo-500">Overview</Link>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isRegister ? 'Create your account' : 'Sign in to InsightAgent'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isRegister
              ? 'Use your full name, email address, and a strong password — or Google.'
              : 'Log in with your email and password or continue with Google.'}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="mt-5 glass-panel-subtle flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 dark:text-slate-100"
          >
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              or with email
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="glass-input w-full px-4 py-2.5 text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {!isRegister && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-2.5 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && <PasswordStrengthChecklist password={password} />}

            <button
              type="submit"
              disabled={submitting || (isRegister && !passwordEval.allPassed)}
              className="aurora-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegister ? 'Creating Account...' : 'Logging In...'}
                </>
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Login'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => switchMode(!isRegister)}
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              {isRegister ? 'Login' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
