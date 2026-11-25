import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { exchangeGoogleCode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const urlError = searchParams.get('error');

    if (urlError) {
      setError(urlError);
      return;
    }

    if (!code) {
      setError('Missing Google authentication code. Please try signing in again.');
      return;
    }

    exchangeGoogleCode(code)
      .then(() => navigate('/studio', { replace: true }))
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to verify Google authentication.');
      });
  }, [searchParams, exchangeGoogleCode, navigate]);

  return (
    <div className="glass-canvas flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 text-center animate-fade-up">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>

        {error ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h2 className="text-base font-bold">Google Sign-In Failed</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{error}</p>
            <Link
              to="/login"
              className="aurora-btn inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-semibold"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Completing Google Sign-In...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying your Google account and creating a secure session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
