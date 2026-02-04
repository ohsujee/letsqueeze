'use client';

/**
 * HostActionFooter - Footer d'actions partagé entre Host et Asker (Party Mode)
 *
 * Boutons: Révéler/Masquer, Passer, Fin
 * Utilisé dans: host/page.jsx, play/page.jsx (asker view)
 */
export default function HostActionFooter({
  revealed,
  onRevealToggle,
  onSkip,
  onEnd
}) {
  return (
    <footer className="game-footer">
      <div className="host-actions">
        <button className="action-btn action-reveal" onClick={onRevealToggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {revealed ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </>
            )}
          </svg>
          <span>{revealed ? "Masquer" : "Révéler"}</span>
        </button>
        <button className="action-btn action-skip" onClick={onSkip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
          <span>Passer</span>
        </button>
        <button className="action-btn action-end" onClick={onEnd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <span>Fin</span>
        </button>
      </div>
    </footer>
  );
}
