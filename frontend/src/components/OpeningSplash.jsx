import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Brief Aurora Glass app-opening intro overlay shown once per browser session.
 */
export default function OpeningSplash() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('insightagent_splash_seen'));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem('insightagent_splash_seen', '1');
    const fadeTimer = setTimeout(() => setFading(true), 850);
    const hideTimer = setTimeout(() => setVisible(false), 1250);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/90 backdrop-blur-2xl transition-opacity duration-300 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center text-center px-6">
        <div className="absolute -inset-16 rounded-full bg-gradient-to-r from-indigo-500/30 via-cyan-500/25 to-violet-500/30 blur-3xl animate-pulse-glow" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-2xl shadow-indigo-500/40">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="relative mt-5 text-3xl font-extrabold tracking-tight text-white">
          Insight<span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">Agent</span>
        </h1>
        <p className="relative mt-1.5 text-xs font-medium tracking-widest uppercase text-cyan-300/80">
          Autonomous Data &amp; Analytics Workbench
        </p>
        <div className="relative mt-5 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400" />
        </div>
      </div>
    </div>
  );
}
