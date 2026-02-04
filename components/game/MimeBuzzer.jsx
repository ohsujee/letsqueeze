'use client';

import { memo } from 'react';
import './MimeBuzzer.css';

/**
 * MimeBuzzer - Bouton buzzer pour Mime
 *
 * États possibles:
 * - active: Prêt à buzzer (vert)
 * - pending: En attente de résolution (jaune)
 * - success: C'est mon tour de répondre (vert vif)
 * - blocked: Quelqu'un d'autre a buzzé (grisé)
 * - penalty: Bloqué par pénalité (orange avec timer)
 * - disabled: Mot non révélé (grisé)
 *
 * @param {Object} props
 * @param {'active'|'pending'|'success'|'blocked'|'penalty'|'disabled'} props.state
 * @param {Function} props.onBuzz - Callback quand on buzze
 * @param {number} props.penaltySeconds - Secondes restantes si penalty
 */
function MimeBuzzer({ state = 'disabled', onBuzz, penaltySeconds = 0 }) {
  const isDisabled = state !== 'active';

  // Labels selon l'état
  const getLabel = () => {
    switch (state) {
      case 'active':
        return 'BUZZ';
      case 'pending':
        return 'BUZZÉ!';
      case 'success':
        return 'À TOI!';
      case 'penalty':
        return `${penaltySeconds}s`;
      case 'blocked':
      case 'disabled':
      default:
        return '';
    }
  };

  const getSublabel = () => {
    switch (state) {
      case 'penalty':
        return 'PÉNALITÉ';
      case 'disabled':
        return 'Attends...';
      default:
        return '';
    }
  };

  const handleClick = () => {
    if (!isDisabled && onBuzz) {
      // Vibration haptique
      navigator?.vibrate?.([100, 50, 200]);
      onBuzz();
    }
  };

  return (
    <div className="mime-buzzer-wrapper">
      <button
        className={`mime-buzzer ${state}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={getLabel() || 'Buzzer'}
      >
        {/* Croix pour état blocked */}
        {state === 'blocked' && <div className="buzzer-cross" />}

        {/* Contenu */}
        <div className="buzzer-content">
          <span className="buzzer-label">{getLabel()}</span>
          {getSublabel() && (
            <span className="buzzer-sublabel">{getSublabel()}</span>
          )}
        </div>
      </button>
    </div>
  );
}

export default memo(MimeBuzzer);
