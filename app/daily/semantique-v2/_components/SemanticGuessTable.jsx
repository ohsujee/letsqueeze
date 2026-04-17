'use client';

/**
 * SemanticGuessTable — tableau des guesses (latest en haut, puis triés par score).
 */

import GuessRow from './GuessRow';

export default function SemanticGuessTable({ guesses, flashEntry }) {
  if (!guesses || guesses.length === 0) return null;

  const latest = guesses[guesses.length - 1];
  const previous = guesses.length > 1
    ? [...guesses.slice(0, -1)].sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="sem-table">
      <div className="sem-table-head">
        <span className="sem-col-num">N°</span>
        <span className="sem-col-word">Mot</span>
        <span className="sem-col-temp">°C 🌡️</span>
        <span className="sem-col-emoji" />
        <span className="sem-col-prog">Rang</span>
      </div>

      {(flashEntry || latest) && (
        <div className="sem-table-latest">
          <GuessRow entry={flashEntry ?? latest} isLatestRow flash={!!flashEntry} />
        </div>
      )}

      {previous.length > 0 && <div className="sem-table-divider" />}

      <div className="sem-table-list">
        {previous.map((entry) => (
          <GuessRow key={`${entry.word}-${entry.attemptIndex}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}
