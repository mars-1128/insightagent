import { Check, X } from 'lucide-react';

export const PASSWORD_RULES = [
  { id: 'minLength', label: 'Minimum 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'At least one number (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', label: 'At least one special character (!@#$...)', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
  { id: 'noSpaces', label: 'No spaces', test: (pw) => pw.length > 0 && !/\s/.test(pw) }
];

export function evaluatePassword(password = '') {
  const results = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password)
  }));

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === PASSWORD_RULES.length;

  let strength = { label: 'Very Weak', score: 0, barColor: 'bg-rose-500', textColor: 'text-rose-500' };
  if (password.length === 0) {
    strength = { label: 'Enter password', score: 0, barColor: 'bg-slate-400', textColor: 'text-slate-400' };
  } else if (passedCount <= 2) {
    strength = { label: 'Weak', score: 1, barColor: 'bg-rose-500', textColor: 'text-rose-500' };
  } else if (passedCount <= 4) {
    strength = { label: 'Fair', score: 2, barColor: 'bg-amber-500', textColor: 'text-amber-500' };
  } else if (!allPassed) {
    strength = { label: 'Almost Strong', score: 3, barColor: 'bg-cyan-500', textColor: 'text-cyan-500' };
  } else if (password.length >= 12) {
    strength = { label: 'Very Strong', score: 4, barColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
  } else {
    strength = { label: 'Strong', score: 4, barColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
  }

  return { results, passedCount, allPassed, strength };
}

export default function PasswordStrengthChecklist({ password }) {
  const { results, strength } = evaluatePassword(password);

  return (
    <div className="glass-panel-subtle p-3.5 space-y-3">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">Password Strength</span>
          <span className={strength.textColor}>{strength.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                strength.score >= segment
                  ? strength.barColor
                  : 'bg-slate-200 dark:bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Live 6-Rule Checklist */}
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
              rule.passed
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-500 dark:text-rose-400'
            }`}
          >
            {rule.passed ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-3 w-3 stroke-[2.5]" />
              </span>
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                <X className="h-3 w-3 stroke-[2.5]" />
              </span>
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
