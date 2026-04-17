/**
 * Helpers partagés entre les jeux daily.
 * Extraits de semantique/SemanticComponents.jsx pour couper la dépendance V1.
 */

export function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// score = rank/1000 (rank 1–1000, 1000 = mot cible)
export function toCelsius(score) {
  if (score >= 1) return 100;
  return Math.round(score * 100 * 100) / 100;
}

export function formatCelsius(score) {
  const deg = toCelsius(score);
  return deg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getTemperature(score) {
  const deg = toCelsius(score);
  if (deg >= 100) return { emoji: '🎯', cls: 'trouve',  barCls: 'bar-trouve'  };
  if (deg >= 50)  return { emoji: '😱', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 40)  return { emoji: '🔥', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 20)  return { emoji: '😎', cls: 'chaud',   barCls: 'bar-chaud'   };
  if (deg >= 0)   return { emoji: '🥶', cls: 'froid',   barCls: 'bar-froid'   };
  return               { emoji: '🧊', cls: 'glacial', barCls: 'bar-glacial' };
}

export function computeFinalScore(attempts) {
  return Math.max(100, Math.round(5000 / (1 + 0.05 * (attempts - 1))));
}

export function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}
