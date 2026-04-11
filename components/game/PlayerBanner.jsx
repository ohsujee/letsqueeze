'use client';

import Avatar from '@/components/ui/Avatar';
import './PlayerBanner.css';

/**
 * PlayerBanner — Row de joueur réutilisable (lobby, classement, accueil).
 * Utilise le composant Avatar partagé.
 *
 * @param {Object} player - { uid, name, avatar?: { id, color } }
 * @param {boolean} isMe - highlight "Toi"
 * @param {boolean} isSelected - border accent + sticky label
 * @param {string} selectedLabel - texte du sticky
 * @param {function} onSelect - rend cliquable
 * @param {string} accentColor - couleur accent (sélection, sticky)
 * @param {string} accentDark - border-bottom accent
 * @param {React.ReactNode} prefix - élément avant le nom (ex: rank badge)
 * @param {React.ReactNode} suffix - élément après le nom (ex: score badge)
 */
export default function PlayerBanner({
  player,
  isMe = false,
  isSelected = false,
  selectedLabel = 'Sélectionné',
  onSelect = null,
  accentColor = '#06b6d4',
  accentDark = '#0891b2',
  prefix = null,
  suffix = null,
  rootClassName = '',
  rootStyle = null,
}) {
  const initial = (player?.name?.[0] || '?').toUpperCase();
  const isClickable = !!onSelect;

  return (
    <div className="pb-wrapper" style={{ '--accent': accentColor, '--accent-dark': accentDark }}>

      {/* Sticky note rôle */}
      {isSelected && (
        <div className="pb-sticky">
          {selectedLabel}
        </div>
      )}

      <div
        className={`pb-root${isSelected ? ' pb-selected' : ''}${isMe ? ' pb-me' : ''}${isClickable ? ' pb-clickable' : ''}${rootClassName ? ` ${rootClassName}` : ''}`}
        style={rootStyle || undefined}
        onClick={isClickable ? () => onSelect(player.uid) : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >

        {/* Avatar */}
        <div className="pb-avatar-wrap">
          <Avatar
            initial={initial}
            size="xs"
            avatarId={player?.avatar?.id}
            avatarColor={player?.avatar?.color}
          />
        </div>

        {/* Optional prefix (e.g. rank badge in leaderboard) */}
        {prefix}

        {/* Nom */}
        <span className="pb-name">
          {player?.name}
        </span>

        {/* Badge "Toi" */}
        {isMe && (
          <span className="pb-me-badge">Toi</span>
        )}

        {/* Optional suffix (e.g. score badge in leaderboard) */}
        {suffix}

      </div>
    </div>
  );
}
