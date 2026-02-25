'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Crown, Lock } from '@phosphor-icons/react';
import EMVChip from './EMVChip';
import './pro-card.css';

const MONTHS_FR = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];

const FRICTION        = 0.93;
const MIN_VELOCITY    = 0.25;
const VEL_SCALE       = 9;
const FLICK_THRESHOLD = 7;
const DEG_PER_PX      = 0.8;
const AXIS_LOCK_PX    = 10; // px avant de verrouiller l'axe

// Retourne l'angle équivalent à targetFace (0 ou 180) le plus proche de currentAngle
// Évite les contre-rotations en choisissant toujours le chemin le plus court
function nearestEquiv(currentAngle, targetFace) {
  const n = Math.round((currentAngle - targetFace) / 360);
  return targetFace + n * 360;
}

function formatMemberSince(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

function formatExpiry(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + 4);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}


export default function ProCard({ pseudo, memberNumber, memberSince, isAdmin = false, isLocked = false }) {
  const sceneRef       = useRef(null);
  const tiltRafRef     = useRef(null);
  const flipRafRef     = useRef(null);
  const angleRef       = useRef(0);       // angle en cours sur l'axe physique
  const velocityRef    = useRef(0);
  const baseAngleXRef  = useRef(0);       // repos X : 0 = avant, 180 = arrière
  const baseAngleYRef  = useRef(0);       // repos Y : 0 = avant, 180 = arrière
  const dragStartXRef  = useRef(null);
  const dragStartYRef  = useRef(null);
  const dragAxisRef    = useRef(null);    // null | 'x' | 'y'
  const physicsAxisRef = useRef('y');
  const isFlippingRef  = useRef(false);
  const historyRef     = useRef([]);

  useEffect(() => () => {
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    if (flipRafRef.current) cancelAnimationFrame(flipRafRef.current);
  }, []);

  const applyTransform = useCallback((rx, ry, transition = 'none') => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }, []);

  // Physique — décélère sur l'axe du flick, snap à la face avant
  const startPhysics = useCallback((initialVelocity, axis) => {
    if (flipRafRef.current) cancelAnimationFrame(flipRafRef.current);
    if (tiltRafRef.current) { cancelAnimationFrame(tiltRafRef.current); tiltRafRef.current = null; }
    physicsAxisRef.current = axis;
    velocityRef.current    = initialVelocity;
    isFlippingRef.current  = true;

    const loop = () => {
      velocityRef.current *= FRICTION;
      if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
        // Normaliser l'angle dans 0-360° (même position visuelle, sans animation)
        const currentAxis = physicsAxisRef.current;
        const normalized  = ((angleRef.current % 360) + 360) % 360;
        // Face avant la plus proche pour minimiser le chemin d'animation
        const nearestFront = normalized > 180 ? 360 : 0;
        const el = sceneRef.current;
        if (el) {
          el.style.transition = 'none';
          el.style.transform  = currentAxis === 'y'
            ? `perspective(700px) rotateX(0deg) rotateY(${normalized}deg)`
            : `perspective(700px) rotateX(${normalized}deg) rotateY(0deg)`;
        }
        // Frame suivante : courte animation ease-out vers la face avant
        flipRafRef.current = requestAnimationFrame(() => {
          angleRef.current      = 0;
          baseAngleXRef.current = 0;
          baseAngleYRef.current = 0;
          isFlippingRef.current = false;
          flipRafRef.current    = null;
          const el2 = sceneRef.current;
          if (!el2) return;
          el2.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el2.style.transform  = currentAxis === 'y'
            ? `perspective(700px) rotateX(0deg) rotateY(${nearestFront}deg)`
            : `perspective(700px) rotateX(${nearestFront}deg) rotateY(0deg)`;
        });
        return;
      }
      angleRef.current += velocityRef.current;
      if (physicsAxisRef.current === 'y') {
        applyTransform(0, angleRef.current);
      } else {
        applyTransform(angleRef.current, 0);
      }
      flipRafRef.current = requestAnimationFrame(loop);
    };
    flipRafRef.current = requestAnimationFrame(loop);
  }, [applyTransform]);

  // Arrêt de la physique — snap à la face la plus proche sur l'axe en cours
  const stopPhysics = useCallback(() => {
    if (!isFlippingRef.current) return;
    if (flipRafRef.current) { cancelAnimationFrame(flipRafRef.current); flipRafRef.current = null; }
    // Toujours revenir au recto (face 0°), sans contre-rotation
    const targetAngle = nearestEquiv(angleRef.current, 0);
    if (physicsAxisRef.current === 'y') {
      baseAngleYRef.current = targetAngle;
      baseAngleXRef.current = 0;
      applyTransform(0, targetAngle);
    } else {
      baseAngleXRef.current = targetAngle;
      baseAngleYRef.current = 0;
      applyTransform(targetAngle, 0);
    }
    angleRef.current      = targetAngle;
    velocityRef.current   = 0;
    isFlippingRef.current = false;
  }, [applyTransform]);

  const handlePointerDown = useCallback((e) => {
    stopPhysics();
    const clientX         = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY         = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragAxisRef.current   = null;
    historyRef.current    = [];
  }, [stopPhysics]);

  const handleTiltMove = useCallback((e) => {
    if (isFlippingRef.current) return;
    if (dragStartXRef.current === null) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    historyRef.current.push({ x: clientX, y: clientY, t: performance.now() });
    if (historyRef.current.length > 6) historyRef.current.shift();

    const dx = clientX - dragStartXRef.current;
    const dy = clientY - dragStartYRef.current;

    // Verrouillage de l'axe
    if (dragAxisRef.current === null) {
      if (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX) {
        dragAxisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'y' : 'x';
      } else {
        return;
      }
    }

    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);

    if (dragAxisRef.current === 'y') {
      const currentY     = baseAngleYRef.current + dx * DEG_PER_PX;
      angleRef.current   = currentY;
      const smallTiltX   = (((clientY - rect.top) / rect.height) - 0.5) * -10;
      tiltRafRef.current = requestAnimationFrame(() => {
        applyTransform(smallTiltX, currentY);
        tiltRafRef.current = null;
      });
    } else {
      const currentX     = baseAngleXRef.current - dy * DEG_PER_PX;
      angleRef.current   = currentX;
      const smallTiltY   = (((clientX - rect.left) / rect.width) - 0.5) * 10;
      tiltRafRef.current = requestAnimationFrame(() => {
        applyTransform(currentX, smallTiltY);
        tiltRafRef.current = null;
      });
    }
  }, [applyTransform]);

  const handleTiltEnd = useCallback(() => {
    if (isFlippingRef.current) return;
    if (dragStartXRef.current === null) return;
    if (tiltRafRef.current) { cancelAnimationFrame(tiltRafRef.current); tiltRafRef.current = null; }

    const axis            = dragAxisRef.current;
    dragStartXRef.current = null;
    dragStartYRef.current = null;
    dragAxisRef.current   = null;

    // Pas de drag détecté (tap)
    if (axis === null) return;

    const h = historyRef.current;

    // Flick rapide → physique sur l'axe du drag
    if (h.length >= 2) {
      const last = h[h.length - 1], prev = h[h.length - 2];
      const dt   = Math.max(1, last.t - prev.t);
      const raw  = axis === 'y'
        ? (last.x - prev.x) / dt * VEL_SCALE
        : -(last.y - prev.y) / dt * VEL_SCALE;
      if (Math.abs(raw) > FLICK_THRESHOLD) {
        startPhysics(raw, axis);
        return;
      }
    }

    // Drag lent → toujours revenir au recto (face 0°), sans contre-rotation
    const targetAngle = nearestEquiv(angleRef.current, 0);

    if (axis === 'y') {
      baseAngleYRef.current = targetAngle;
      baseAngleXRef.current = 0;
      applyTransform(0, targetAngle, 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    } else {
      baseAngleXRef.current = targetAngle;
      baseAngleYRef.current = 0;
      applyTransform(targetAngle, 0, 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    }
    angleRef.current = targetAngle;
  }, [startPhysics, applyTransform]);

  const numberDisplay = isAdmin
    ? 'N° 000000'
    : isLocked
      ? null
      : memberNumber != null
        ? `N° ${String(memberNumber).padStart(6, '0')}`
        : '—';

  const sinceDisplay = formatMemberSince(memberSince);
  const expiryDisplay = formatExpiry(memberSince);
  const nameDisplay  = (pseudo || 'MEMBRE').toUpperCase();
  const sigDisplay   = pseudo || 'Membre';

  return (
    <div
      ref={sceneRef}
      className={`pro-card-scene${isLocked ? ' locked' : ''}`}
      onTouchStart={handlePointerDown}
      onTouchMove={handleTiltMove}
      onTouchEnd={handleTiltEnd}
      onMouseDown={handlePointerDown}
      onMouseMove={handleTiltMove}
      onMouseUp={handleTiltEnd}
      onMouseLeave={handleTiltEnd}
      style={{ transform: 'perspective(700px) rotateX(0deg) rotateY(0deg)', transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >

      {/* ── FACE AVANT ── */}
      <div className="pro-status-card">
        <div className="pro-card-shimmer" />
        <img src="/images/guilloche-pattern.svg" className="pro-card-guilloche" aria-hidden="true" alt="" />

        <div className="pro-card-top">
          <div className="pro-card-brand">
            <Crown size={16} weight="fill" />
            <span>GIGGLZ PRO</span>
          </div>
          <img src="/images/mascot/giggly-carte.webp" alt="" className="pro-card-giggly" />
        </div>

        <div className="pro-card-chip-row">
          <EMVChip className="pro-card-chip" />
          {!isLocked && sinceDisplay && (
            <div className="pro-card-since">
              <span className="pro-card-since-label">Depuis</span>
              <span className="pro-card-since-date">{sinceDisplay}</span>
            </div>
          )}
        </div>

        <div className="pro-card-bottom">
          <div className="pro-card-holder">
            <span className="pro-card-label">Membre</span>
            <span className="pro-card-name">{nameDisplay}</span>
          </div>
          <div className="pro-card-number-wrap">
            <span className="pro-card-label">Numéro</span>
            <span className="pro-card-num">
              {isLocked ? (<><Lock size={13} weight="fill" />N° ??????</>) : numberDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* ── FACE ARRIÈRE ── */}
      <div className="pro-card-back-face">
        <div className="pro-card-shimmer" />
        <img src="/images/guilloche-pattern.svg" className="pro-card-guilloche" aria-hidden="true" alt="" />

        <div className="pro-card-stripe" />

        <div className="pro-card-sig-row">
          <div className="pro-card-sig-strip">
            <span className="pro-card-sig-label">Signature du membre</span>
            <span className="pro-card-sig-value">{sigDisplay}</span>
          </div>
        </div>

        <div className="pro-card-back-footer">
          <div className="pro-card-back-left">
            <div className="pro-card-expiry-cvv-row">
              {expiryDisplay && (
                <div className="pro-card-expiry">
                  <span className="pro-card-expiry-label">VALID THRU</span>
                  <span className="pro-card-expiry-date">{expiryDisplay}</span>
                </div>
              )}
              <div className="pro-card-expiry">
                <span className="pro-card-expiry-label">CVV</span>
                <span className="pro-card-expiry-date">GGZ</span>
              </div>
            </div>
            <p className="pro-card-back-legal">GIGGLZ BANK OF CHAOS · USAGE FESTIF UNIQUEMENT</p>
          </div>
          <div className="pro-card-back-brand">
            <Crown size={10} weight="fill" />
            <span>GIGGLZ PRO</span>
          </div>
        </div>
      </div>

    </div>
  );
}
