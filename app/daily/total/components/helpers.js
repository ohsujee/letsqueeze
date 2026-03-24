// ─── Constants ──────────────────────────────────────────────────────────────
export const TIMER_SECONDS = 180; // 3 minutes
export const OPERATORS = ['+', '−', '×', '÷'];
export const MAX_SUBMISSIONS = 3;

// ─── Expression Evaluator (left-to-right, like a basic calculator) ──────────
export function evaluateTokens(tokens) {
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && typeof tokens[0] === 'number') return tokens[0];
  if (tokens.length < 1) return null;

  // Evaluate up to the last number (ignore trailing operator)
  let result = tokens[0];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const b = tokens[i + 1];
    if (b === undefined) break; // trailing operator, stop here

    switch (op) {
      case '+': result = result + b; break;
      case '−': result = result - b; break;
      case '×': result = result * b; break;
      case '÷':
        if (b === 0) return null;
        result = result / b;
        break;
      default: return null;
    }
  }

  return Number.isFinite(result) ? result : null;
}

// ─── Scoring ────────────────────────────────────────────────────────────────
export function computeScore(difference, timeMs) {
  const precision = Math.max(500, 5000 - Math.round(difference * 60));
  const timeBonus = Math.round(999 * Math.exp(-timeMs / 120000));
  return precision + timeBonus;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}

export function formatResult(val) {
  if (val === null) return '—';
  if (Number.isInteger(val)) return val.toString();
  return Math.round(val * 100) / 100 + '';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
