import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

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
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="grid w-full max-w-5xl grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        {/* Left Feature Pitch */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 p-10 border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">InsightAgent</h1>
                <p className="text-xs text-cyan-300">Autonomous Data & Analytics Agent</p>
              </div>
            </div>

            <h2 className="mt-10 text-3xl font-extrabold leading-tight text-white">
              Talk to your data like a colleague, not a database.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Upload any CSV or explore built-in business datasets. Watch the AI agent plan steps, run verified read-only PostgreSQL queries, compute statistics, and generate live interactive visualizations.
            </p>
          </div>

          <div className="space-y-3 pt-8">
            {[
              { icon: BarChart3, text: 'Editable plans, live tool traces & interactive charts' },
              { icon: ShieldCheck, text: 'Strict read-only SQL sandbox + human approval gates' },
              { icon: Lock, text: 'Clarifies ambiguous questions instead of guessing' }
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 text-xs text-slate-200">
                <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">InsightAgent</span>
          </div>

          <h2 className="text-2xl font-bold text-white">
            {isRegister ? 'Create your workspace' : 'Sign in to InsightAgent'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isRegister
              ? 'Get instant access to AI-powered SQL analytics and sample datasets.'
              : 'Welcome back — enter your credentials to continue.'}
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60"
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

          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {isRegister ? 'Sign in' : 'Register free'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
