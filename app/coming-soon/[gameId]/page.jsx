'use client';

import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';

const GAME_INFO = {
  memory: {
    name: 'Memory',
    description: 'Testez votre mémoire dans différentes situations !',
    emoji: '🧠',
    color: '#ec4899',
    glow: '#f472b6',
  },
  laregle: {
    name: 'La Règle',
    description: 'Découvrez la règle secrète que les autres joueurs suivent !',
    emoji: '⚖️',
    color: '#06b6d4',
    glow: '#22d3ee',
  },
};

export default function ComingSoonPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId;

  const game = GAME_INFO[gameId] || {
    name: 'Nouveau Jeu',
    description: 'Un nouveau jeu arrive bientôt !',
    emoji: '🎮',
    color: '#8b5cf6',
    glow: '#a78bfa',
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh',
      background: '#0a0a0f',
      overflow: 'hidden',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: `
          radial-gradient(ellipse at 30% 70%, ${game.color}25 0%, transparent 50%),
          radial-gradient(ellipse at 70% 30%, ${game.glow}20 0%, transparent 50%),
          #0a0a0f
        `,
        pointerEvents: 'none',
      }} />

      <motion.main
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.5rem',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Icon with glow */}
        <div style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: game.color,
              filter: 'blur(30px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span style={{ fontSize: '4rem', position: 'relative', zIndex: 1 }}>
            {game.emoji}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Bungee', cursive",
          fontSize: 'clamp(2rem, 10vw, 3.5rem)',
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
          textShadow: `0 0 10px ${game.glow}, 0 0 20px ${game.glow}, 0 0 40px ${game.color}`,
        }}>
          {game.name}
        </h1>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '8px 20px',
          background: `linear-gradient(135deg, ${game.color}33, ${game.glow}20)`,
          border: `2px solid ${game.color}66`,
          borderRadius: '999px',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 700,
            color: game.glow,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}>
            À VENIR
          </span>
        </div>

        {/* Description */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.125rem',
          color: 'rgba(255, 255, 255, 0.8)',
          margin: 0,
          maxWidth: '300px',
        }}>
          {game.description}
        </p>

        {/* Subtext */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.5)',
          margin: 0,
          lineHeight: 1.6,
        }}>
          Ce mode de jeu est en cours de développement.
          <br />
          Restez connectés !
        </p>

        {/* Back button */}
        <motion.button
          style={{
            marginTop: '1rem',
            padding: '14px 28px',
            background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            boxShadow: `0 4px 15px ${game.color}66, 0 0 30px ${game.color}33`,
          }}
          onClick={() => router.push('/home')}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          Retour à l'accueil
        </motion.button>
      </motion.main>
    </div>
  );
}
