'use client';

/**
 * CodeBreakerPalette — sélection couleur + boutons action.
 */

import { Eraser } from '@phosphor-icons/react';
import { COLORS } from '../_hooks/useCodeBreakerGame';

export default function CodeBreakerPalette({
  onSelectColor,
  onClear,
  onSubmit,
  isFull,
  disabled,
}) {
  return (
    <div className="cb-controls">
      <div className="cb-palette">
        {COLORS.map((color, i) => (
          <button
            key={i}
            className="cb-color-btn"
            style={{ background: color }}
            onClick={() => onSelectColor(i)}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="cb-actions">
        <button className="cb-action-btn" onClick={onClear} disabled={disabled}>
          <Eraser size={18} weight="bold" />
        </button>
        <button
          className={`cb-submit-btn ${isFull ? 'active' : ''}`}
          onClick={onSubmit}
          disabled={!isFull || disabled}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
