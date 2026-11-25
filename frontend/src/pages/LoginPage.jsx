import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/studio', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/studio');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-canvas flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 lg:grid-cols-2 overflow-hidden glass-panel animate-fade-up">
        {/* Left Aurora Glass Pitch */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-cyan-500/20 p-10 border-r border-slate-200/70 dark:border-white/10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-cyan-300 mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Overview
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">InsightAgent</h1>
                <p className="text-xs text-indigo-600 dark:text-cyan-300">Autonomous Data &amp; Analytics Agent</p>
              </div>
            </div>

            <h2 className="mt-10 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white">
              Talk to your data like a colleague, not a database.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Upload any CSV or explore built-in business datasets. Watch the AI agent plan steps, run verified read-only PostgreSQL queries, compute statistics, and generate live interactive visualizations.
            </p>
          </div>

          <div className="space-y-3 pt-8">
            {[
              { icon: BarChart3, text: 'Editable plans, live tool traces & interactive charts' },
              { icon: ShieldCheck, text: 'Strict read-only SQL sandbox + human approval gates' },
              { icon: Lock, text: 'Clarifies ambiguous questions instead of guessing' }
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="glass-panel-subtle flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200">
                <Icon className="h-4 w-4 text-cyan-500 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
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
            {isRegister ? 'Create your workspace' : 'Sign in to InsightAgent'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isRegister
              ? 'Get instant access to AI-powered SQL analytics and sample datasets.'
              : 'Welcome back — enter your credentials to continue.'}
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full px-4 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="aurora-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              {isRegister ? 'Sign in' : 'Register free'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
