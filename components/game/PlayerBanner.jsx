'use client';

import './PlayerBanner.css';

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

    </div>
  );
}
