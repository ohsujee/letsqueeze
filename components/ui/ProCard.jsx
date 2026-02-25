'use client';

import { useRef, useCallback, useState } from 'react';
import { Crown, Lock } from '@phosphor-icons/react';
import EMVChip from './EMVChip';
import './pro-card.css';

const MONTHS_FR = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];

function formatMemberSince(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Carte Pro réutilisable — style crédit card gold avec tilt 3D
 *
 * @param {string}  pseudo       - Nom du membre affiché sur la carte
 * @param {number}  memberNumber - Numéro de membre (null si pas encore assigné)
 * @param {number}  memberSince  - Timestamp du premier abonnement
 * @param {boolean} isAdmin      - Affiche N° 000000 (founders)
 * @param {boolean} isLocked     - Mode aperçu : carte désaturée + N° ?????? + cadenas
 */
export default function ProCard({ pseudo, memberNumber, memberSince, isAdmin = false, isLocked = false }) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isTilting, setIsTilting] = useState(false);

  const handleTiltMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const rotateX = (((clientY - rect.top) / rect.height) - 0.5) * -18;
      const rotateY = (((clientX - rect.left) / rect.width) - 0.5) * 18;
      setTilt({ x: rotateX, y: rotateY });
      setIsTilting(true);
      rafRef.current = null;
    });
  }, []);

  const handleTiltEnd = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setTilt({ x: 0, y: 0 });
    setIsTilting(false);
  }, []);

  const numberDisplay = isAdmin
    ? 'N° 000000'
    : isLocked
      ? null
      : memberNumber != null
        ? `N° ${String(memberNumber).padStart(6, '0')}`
        : '—';

  const sinceDisplay = formatMemberSince(memberSince);

  return (
    <div
      ref={cardRef}
      className={`pro-status-card${isLocked ? ' locked' : ''}`}
      onTouchMove={handleTiltMove}
      onTouchEnd={handleTiltEnd}
      onMouseMove={handleTiltMove}
      onMouseLeave={handleTiltEnd}
      style={{
        transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: isTilting ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="pro-card-shimmer" />

      {/* Top: brand + Giggly */}
      <div className="pro-card-top">
        <div className="pro-card-brand">
          <Crown size={12} weight="fill" />
          <span>GIGGLZ PRO</span>
        </div>
        <img src="/images/mascot/giggly-carte.webp" alt="" className="pro-card-giggly" />
      </div>

      {/* Chip EMV + Membre depuis */}
      <div className="pro-card-chip-row">
        <EMVChip className="pro-card-chip" />
        {!isLocked && sinceDisplay && (
          <div className="pro-card-since">
            <span className="pro-card-since-label">Depuis</span>
            <span className="pro-card-since-date">{sinceDisplay}</span>
          </div>
        )}
      </div>

      {/* Bottom: cardholder + numéro */}
      <div className="pro-card-bottom">
        <div className="pro-card-holder">
          <span className="pro-card-label">Membre</span>
          <span className="pro-card-name">
            {(pseudo || 'MEMBRE').toUpperCase()}
          </span>
        </div>
        <div className="pro-card-number-wrap">
          <span className="pro-card-label">Numéro</span>
          <span className="pro-card-num">
            {isLocked ? (
              <>
                <Lock size={13} weight="fill" />
                N° ??????
              </>
            ) : numberDisplay}
          </span>
        </div>
      </div>

    </div>
  );
}
