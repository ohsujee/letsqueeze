'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RejoinBanner({ activeGame, onDismiss }) {
  const router = useRouter();

  if (!activeGame) return null;

  const handleRejoin = () => {
    router.push(activeGame.rejoinUrl);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="rejoin-banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="rejoin-content">
          <div className="rejoin-icon">
            <Play size={20} />
          </div>
          <div className="rejoin-text">
            <span className="rejoin-title">Partie en cours</span>
            <span className="rejoin-subtitle">
              {activeGame.playerName} • {activeGame.score} pts
            </span>
          </div>
        </div>
        <div className="rejoin-actions">
          <motion.button
            className="rejoin-btn"
            onClick={handleRejoin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Rejoindre
          </motion.button>
          <motion.button
            className="dismiss-btn"
            onClick={onDismiss}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={18} />
          </motion.button>
        </div>

        <style jsx>{`
          .rejoin-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 16px;
            margin-bottom: 16px;
          }

          .rejoin-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
          }

          .rejoin-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #10b981, #34d399);
            border-radius: 12px;
            color: white;
            flex-shrink: 0;
          }

          .rejoin-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }

          .rejoin-title {
            font-family: var(--font-display, 'Space Grotesk'), sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-primary, #fff);
          }

          .rejoin-subtitle {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .rejoin-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .rejoin-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            border-radius: 10px;
            color: white;
            font-family: var(--font-display, 'Space Grotesk'), sans-serif;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
          }

          .dismiss-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
          }

          .dismiss-btn:hover {
            color: rgba(255, 255, 255, 0.9);
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
