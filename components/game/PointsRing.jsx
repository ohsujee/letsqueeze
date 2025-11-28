"use client";

import { motion, useSpring, useTransform, AnimatePresence, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export default function PointsRing({ value = 1, points = 0, size = 100, label = "pts" }) {
  const prevPoints = useRef(points);
  const [displayPoints, setDisplayPoints] = useState(points);

  // Animation fluide du compteur de points
  const springPoints = useSpring(points, {
    stiffness: 100,
    damping: 20
  });

  useEffect(() => {
    springPoints.set(points);
    prevPoints.current = points;
  }, [points, springPoints]);

  // Mettre à jour l'affichage à chaque frame
  useEffect(() => {
    const unsubscribe = springPoints.on('change', (latest) => {
      setDisplayPoints(Math.round(latest));
    });
    return unsubscribe;
  }, [springPoints]);
  // On utilise TOUJOURS la vraie valeur pour l'animation
  const clampedValue = Math.max(0, Math.min(1, value));
  const degrees = clampedValue * 360;
  
  // Couleurs dynamiques selon la valeur
  const getColor = () => {
    if (clampedValue > 0.7) return '#10B981'; // Vert (beaucoup de temps)
    if (clampedValue > 0.4) return '#F59E0B'; // Orange (temps moyen)
    if (clampedValue > 0.1) return '#EF4444'; // Rouge (peu de temps)
    return '#64748B'; // Gris (temps écoulé)
  };

  const ringColor = getColor();
  
  const style = {
    "--deg": `${degrees}deg`,
    "--size": `${size}px`,
    "--ring-color": ringColor,
  };

  // Animations basées sur le temps restant
  const ringVariants = {
    critical: {
      scale: [1, 1.05, 1],
      rotate: [0, -2, 2, -2, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 0.2
      }
    },
    warning: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    normal: {
      scale: 1,
      rotate: 0
    }
  };

  const getAnimationState = () => {
    if (clampedValue <= 0.1) return 'critical';
    if (clampedValue <= 0.4) return 'warning';
    return 'normal';
  };

  return (
    <motion.div
      className="points-ring-container"
      style={style}
      variants={ringVariants}
      animate={getAnimationState()}
    >
      {/* Ring SVG pour un contrôle parfait */}
      <motion.svg
        width={size}
        height={size}
        className="points-ring-svg"
        style={{ transform: 'rotate(-90deg)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke="var(--bg-accent)"
          strokeWidth="6"
          opacity="0.3"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (size - 16)} ${Math.PI * (size - 16)}`}
          strokeDashoffset={Math.PI * (size - 16) * (1 - clampedValue)}
          className="points-ring-progress"
        />
        
        {/* Glow effect circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (size - 16)} ${Math.PI * (size - 16)}`}
          strokeDashoffset={Math.PI * (size - 16) * (1 - clampedValue)}
          className="points-ring-glow"
          opacity="0.6"
        />
      </motion.svg>

      {/* Content overlay */}
      <div className="points-ring-content">
        <motion.div
          className="points-ring-number"
          animate={{
            scale: clampedValue <= 0.1 ? [1, 1.1, 1] : 1
          }}
          transition={{
            duration: 0.3,
            repeat: clampedValue <= 0.1 ? Infinity : 0
          }}
        >
          {displayPoints}
        </motion.div>
        <div className="points-ring-label">
          {label}
        </div>
      </div>
      
      <style jsx>{`
        .points-ring-container {
          position: relative;
          width: var(--size);
          height: var(--size);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .points-ring-svg {
          position: absolute;
          filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.3));
        }
        
        .points-ring-progress {
          transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;
        }
        
        .points-ring-glow {
          filter: blur(2px);
          transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;
        }
        
        .points-ring-content {
          position: relative;
          z-index: 10;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        
        .points-ring-number {
          font-size: ${size > 80 ? '1.5rem' : '1.25rem'};
          font-weight: 800;
          color: var(--ring-color);
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          margin-bottom: 2px;
        }
        
        .points-ring-label {
          font-size: ${size > 80 ? '0.75rem' : '0.625rem'};
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
          opacity: 0.8;
        }
        
        /* Animation quand les points changent */
        @keyframes points-change {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .points-ring-number {
          animation: points-change 0.3s ease;
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .points-ring-number {
            font-size: ${size > 80 ? '1.25rem' : '1rem'};
          }
          
          .points-ring-label {
            font-size: ${size > 80 ? '0.625rem' : '0.5rem'};
          }
        }
      `}</style>
    </motion.div>
  );
}
