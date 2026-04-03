'use client';


const AVATAR_PALETTE = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#26DE81', '#48DBFB',
  '#FF9FF3', '#A29BFE', '#FD79A8', '#E17055', '#FDCB6E',
  '#74B9FF', '#55EFC4', '#F9CA24', '#6AB04C', '#FC5C65',
  '#FA8231', '#45AAF2', '#20BF6B', '#EB3B5A', '#78E08F',
];

const getPlayerColor = (uid = '') => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(hash)];
};

export default function PlayerBanner({
  player,
  isMe = false,
  isSelected = false,
  selectedLabel = 'Sélectionné',
  onSelect = null,
  accentColor = '#06b6d4',
  accentDark = '#0891b2',
}) {
  const initials = player?.name?.slice(0, 2).toUpperCase() || '?';
  const isClickable = !!onSelect;
  const playerColor = getPlayerColor(player?.uid);

  return (
    <div className="pb-wrapper" style={{ '--accent': accentColor, '--accent-dark': accentDark, '--player-color': playerColor }}>

      {/* Sticky note rôle */}
      {isSelected && (
        <div className="pb-sticky">
          {selectedLabel}
        </div>
      )}

      <div
        className={`pb-root${isSelected ? ' pb-selected' : ''}${isMe ? ' pb-me' : ''}${isClickable ? ' pb-clickable' : ''}`}
        onClick={isClickable ? () => onSelect(player.uid) : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >

      <div className={`pb-avatar${isSelected ? ' pb-avatar-selected' : ''}`}>
        {initials}
      </div>

      <span className="pb-name">
        {player?.name}
      </span>

      {isMe && (
        <div className="pb-me-dot" />
      )}

    </div>

    <style jsx>{`
        .pb-wrapper {
          position: relative;
          overflow: visible;
          width: 100%;
          padding-top: 10px;
        }

        .pb-root {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: #222240;
          border: none;
          border-bottom: 2px solid #1a1a35;
          border-radius: 10px;
          text-align: left;
          cursor: default;
          box-sizing: border-box;
          overflow: visible;
        }

        .pb-root.pb-me {
          background: var(--flat-bg, #2d1f5e);
          border-bottom-color: var(--flat-bg-dark, #1e1445);
        }

        .pb-root.pb-selected {
          border-bottom-color: var(--accent);
        }

        .pb-root.pb-clickable {
          cursor: pointer;
        }

        .pb-root.pb-clickable:active {
          transform: translateY(1px);
          border-bottom-width: 1px;
        }

        /* ── Sticky note rôle ── */
        .pb-sticky {
          position: absolute;
          top: 2px;
          right: 10px;
          background: var(--accent);
          color: #0a0a0f;
          font-size: 0.58rem;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 5px;
          transform: rotate(3deg);
          letter-spacing: 0.1em;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          text-transform: uppercase;
          pointer-events: none;
          white-space: nowrap;
          z-index: 2;
        }

        /* ── Avatar ── */
        .pb-avatar {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--player-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: #0a0a0f;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          letter-spacing: 0.02em;
        }

        .pb-avatar.pb-avatar-selected {
          border: 3px solid var(--accent);
        }

        /* ── Nom ── */
        .pb-name {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Indicateur "moi" ── */
        .pb-me-dot {
          flex-shrink: 0;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}
