'use client';

import { forwardRef } from 'react';
import { getAvatarUrl, DEFAULT_AVATAR } from '@/lib/config/avatars';
import './avatar.css';

/**
 * Avatar — Réutilisable partout (accueil, profil, classements, lobbies).
 */
const Avatar = forwardRef(function Avatar({
  initial = '?',
  size = 'sm',
  showStatus = false,
  avatarId = null,
  avatarColor = null,
  onClick,
}, ref) {
  const effectiveId = avatarId || DEFAULT_AVATAR.id;
  const imageUrl = getAvatarUrl(effectiveId);
  const bgColor = avatarColor || (avatarId ? '#8b5cf6' : DEFAULT_AVATAR.color);

  return (
    <div
      ref={ref}
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
});

export default Avatar;
