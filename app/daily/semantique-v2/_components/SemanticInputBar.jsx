'use client';

/**
 * SemanticInputBar — zone input + bouton Valider (flat cartoon).
 * Accepte une ref externe pour l'input zone (pour useSemanticKeyboard).
 */

import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneTilt } from '@phosphor-icons/react';

const SemanticInputBar = forwardRef(function SemanticInputBar({
  input,
  onChange,
  onSubmit,
  onKeyDown,
  onFocus,
  onBlur,
  inputRef,
  error,
  disabled,
  isSubmitting,
}, ref) {
  return (
    <div ref={ref} className="sem-input-zone">
      <AnimatePresence>
        {error && (
          <motion.div
            className="sem-input-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`sem-input-bar${isSubmitting ? ' submitting' : ''}`}>
        <input
          ref={inputRef}
          className="sem-input"
          type="text"
          placeholder="Entrez un mot…"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          className="sem-input-submit"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSubmit}
          disabled={!input.trim() || disabled || isSubmitting}
        >
          <PaperPlaneTilt size={15} weight="fill" /> Valider
        </button>
      </div>
    </div>
  );
});

export default SemanticInputBar;
