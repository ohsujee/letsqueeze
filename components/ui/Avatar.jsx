'use client';

import { getAvatarUrl } from '@/lib/config/avatars';
import './avatar.css';

/**
 * Avatar — Réutilisable partout (accueil, profil, classements, lobbies).
 *
 * Props:
 *   initial    — lettre fallback si pas d'avatar image
 *   size       — 'sm' (44px) | 'md' (56px) | 'lg' (100px)
 *   showStatus — point vert "en ligne"
 *   avatarId   — id de l'animal (ex: 'fox') → affiche l'image
 *   avatarColor — couleur de fond (ex: '#8b5cf6')
 *   onClick    — rend l'avatar cliquable
 */
export default function Avatar({
  initial = '?',
  size = 'sm',
  showStatus = false,
  avatarId = null,
  avatarColor = null,
  onClick,
}) {
  const imageUrl = getAvatarUrl(avatarId);
  const bgColor = avatarColor || '#8b5cf6';

  return (
    <div
      className={`avatar-container avatar-container--${size} ${onClick ? 'avatar-container--clickable' : ''}`}
      onClick={onClick}
    >
      <div
        className={`avatar-placeholder avatar-placeholder--${size}${imageUrl ? ' avatar-placeholder--has-image' : ''}`}
        style={{ backgroundColor: bgColor }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="avatar-image"
            draggable={false}
            loading="lazy"
          />
        ) : (
          initial
        )}
      </div>
      {showStatus && <div className="avatar-status" />}
    </div>
  );
}
