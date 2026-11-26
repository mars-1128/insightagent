import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * Brief Obsidian Observatory entrance reveal shown once per browser session.
 */
export default function OpeningSplash() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('insightagent_splash_seen'));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem('insightagent_splash_seen', '1');
    const fadeTimer = setTimeout(() => setFading(true), 800);
    const hideTimer = setTimeout(() => setVisible(false), 1150);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#040b11]/95 backdrop-blur-2xl transition-opacity duration-300 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center text-center px-6">
        <div className="absolute -inset-16 rounded-full bg-gradient-to-r from-emerald-500/25 via-cyan-500/25 to-teal-500/25 blur-3xl animate-pulse-glow" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-2xl shadow-emerald-500/35">
          <BarChart3 className="h-8 w-8 stroke-[2.3]" />
        </div>
        <h1 className="relative mt-5 font-display text-3xl font-bold tracking-tight text-white">
          Insight<span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Agent</span>
        </h1>
        <p className="relative mt-1.5 font-mono text-[11px] font-medium tracking-widest uppercase text-emerald-300/80">
          Autonomous Data Observatory
        </p>
        <div className="relative mt-5 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-scan-line" />
        </div>
      </div>
    </div>
  );
}
