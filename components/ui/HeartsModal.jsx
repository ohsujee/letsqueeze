'use client';

/**
 * HeartsModal — Flat Cartoon Style
 * S'affiche quand le joueur clique sur sa barre de cœurs ou tente de jouer sans cœurs.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, GameController, Clock, FilmSlate } from '@phosphor-icons/react';
import { Crown } from 'lucide-react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import HeartSVG from '@/components/ui/HeartSVG';
import './hearts-modal.css';

const MAX_HEARTS = 5;

export default function HeartsModal({
  isOpen,
  onClose,
  heartsRemaining = MAX_HEARTS,
  isWatchingAd = false,
  canRecharge = true,
  onWatchAd,
  onUpgrade,
  canClose = true,
  onGoHome,
}) {
  useBackHandler(onClose, isOpen && canClose);

  if (!isOpen) return null;

  const isBlocked = heartsRemaining === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="hm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={canClose ? onClose : undefined}
        >
          <motion.div
            className="hm-modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`hm-header ${isBlocked ? 'hm-header--blocked' : ''}`}>
              {canClose && (
                <button className="hm-close" onClick={onClose}>
                  <X weight="bold" size={16} />
                </button>
              )}

              <div className="hm-hearts-row">
                {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                  <HeartSVG key={i} full={i < heartsRemaining} size={32} />
                ))}
              </div>

              <h2 className="hm-title">
                {isBlocked
                  ? 'Oups, plus de cœurs !'
                  : `${heartsRemaining} cœur${heartsRemaining !== 1 ? 's' : ''} restant${heartsRemaining !== 1 ? 's' : ''}`}
              </h2>
            </div>

            {/* Body */}
            <div className="hm-body">
              {/* Explication */}
              <div className="hm-info-block">
                {isBlocked ? (
                  <>
                    <div className="hm-info-row">
                      <FilmSlate size={18} weight="fill" className="hm-info-icon" />
                      <span className="hm-info-text">Regarde une courte vidéo pour récupérer tous tes cœurs</span>
                    </div>
                    <div className="hm-info-row">
                      <Clock size={18} weight="fill" className="hm-info-icon" />
                      <span className="hm-info-text">Sinon, ils se rechargent automatiquement à minuit</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hm-info-row">
                      <GameController size={18} weight="fill" className="hm-info-icon" />
                      <span className="hm-info-text">Chaque partie utilise 1 cœur</span>
                    </div>
                    <div className="hm-info-row">
                      <Clock size={18} weight="fill" className="hm-info-icon" />
                      <span className="hm-info-text">Tous les cœurs se rechargent à minuit</span>
                    </div>
                    <div className="hm-info-row">
                      <FilmSlate size={18} weight="fill" className="hm-info-icon" />
                      <span className="hm-info-text">Regarde une pub pour recharger à tout moment</span>
                    </div>
                  </>
                )}
              </div>

              {/* Bouton vidéo — toujours visible dès qu'un cœur manque */}
              {canRecharge && heartsRemaining < MAX_HEARTS && (
                <motion.button
                  className={`hm-btn hm-btn--recharge ${isWatchingAd ? 'hm-btn--loading' : ''}`}
                  onClick={onWatchAd}
                  disabled={isWatchingAd}
                  whileTap={isWatchingAd ? {} : { y: 2 }}
                >
                  {!isWatchingAd && <span className="hm-sticker">Pub</span>}
                  <Play weight="fill" size={16} />
                  {isWatchingAd ? 'Chargement...' : 'Recharger mes cœurs'}
                </motion.button>
              )}

              {/* Bouton Pro */}
              <motion.button
                className="hm-btn hm-btn--pro"
                onClick={onUpgrade}
                whileTap={{ y: 2 }}
              >
                <Crown size={18} strokeWidth={2.5} />
                Parties illimitées, sans pub
              </motion.button>

              {/* Retour accueil si bloquant */}
              {!canClose && onGoHome && (
                <button className="hm-btn hm-btn--back" onClick={onGoHome}>
                  Retour à l'accueil
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
