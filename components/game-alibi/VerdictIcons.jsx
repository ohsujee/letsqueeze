"use client";
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

/** Icône VALIDÉ - Checkmark animé avec glow pulsant */
export function ValidIcon({ size = 120, color = "#22c55e", glowColor = "#4ade80" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: 'blur(10px)' }}
      />
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${glowColor})`,
          boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${color}, inset 0 -4px 20px rgba(0,0,0,0.3), inset 0 4px 20px rgba(255,255,255,0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          <motion.path d="M4 12.5L9.5 18L20 6" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }} />
        </svg>
      </motion.div>
    </div>
  );
}

/** Icône REFUSÉ - X animé avec effet d'explosion */
export function RefuseIcon({ size = 120, color = "#ef4444", glowColor = "#f87171" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: [0.5, 2.5], opacity: [0.8, 0] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5, ease: "easeOut" }}
        style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />
      <motion.div
        initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, #b91c1c)`,
          boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${color}, inset 0 -4px 20px rgba(0,0,0,0.4), inset 0 4px 20px rgba(255,255,255,0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          <motion.path d="M6 6L18 18" stroke="white" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.2 }} />
          <motion.path d="M18 6L6 18" stroke="white" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.4 }} />
        </svg>
      </motion.div>
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`shard-${i}`}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: Math.cos((i * 30 * Math.PI) / 180) * size * 0.8, y: Math.sin((i * 30 * Math.PI) / 180) * size * 0.8, scale: 0, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3, repeat: Infinity, repeatDelay: 2 }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 6, height: 16, marginLeft: -3, marginTop: -8,
            background: glowColor, borderRadius: 3,
            transform: `rotate(${i * 30}deg)`, boxShadow: `0 0 10px ${glowColor}`
          }}
        />
      ))}
    </div>
  );
}

/** Icône TIMEOUT - Sablier animé */
export function TimeoutIcon({ size = 120, color = "#f59e0b", glowColor = "#fbbf24" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: 'blur(10px)' }}
      />
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, #d97706)`,
          boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${color}, inset 0 -4px 20px rgba(0,0,0,0.3), inset 0 4px 20px rgba(255,255,255,0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          <motion.path d="M5 3H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
          <motion.path d="M5 21H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.1 }} />
          <motion.path d="M6 3V6C6 8 8 10 12 12C8 14 6 16 6 18V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
          <motion.path d="M18 3V6C18 8 16 10 12 12C16 14 18 16 18 18V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
          <motion.path d="M8 5L12 9L16 5" fill="white" fillOpacity="0.9" initial={{ opacity: 1, scaleY: 1 }} animate={{ opacity: [0.9, 0.3, 0.9], scaleY: [1, 0.3, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '12px 5px' }} />
          {[0, 1, 2].map((i) => (
            <motion.circle key={`grain-${i}`} cx="12" r="0.8" fill="white" initial={{ cy: 11, opacity: 0 }} animate={{ cy: [11, 14, 17], opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: i * 0.25, repeat: Infinity, ease: "easeIn" }} />
          ))}
          <motion.path d="M8 19L12 15L16 19" fill="white" fillOpacity="0.9" initial={{ opacity: 0.3, scaleY: 0.3 }} animate={{ opacity: [0.3, 0.9, 0.3], scaleY: [0.3, 1, 0.3] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '12px 19px' }} />
        </svg>
      </motion.div>
    </div>
  );
}

/** Particles explosifs */
export function ExplosiveParticles({ count = 30, color }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return [...Array(count)].map((_, i) => ({
      id: i, startX: cx, startY: cy,
      endX: cx + (Math.random() - 0.5) * 800,
      endY: cy + (Math.random() - 0.5) * 800,
      scale: Math.random() * 2 + 1,
      duration: 2 + Math.random(),
      delay: Math.random() * 0.5
    }));
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id} className="verdict-particle"
          initial={{ opacity: 0, x: p.startX, y: p.startY, scale: 0 }}
          animate={{ opacity: [0, 1, 0], x: p.endX, y: p.endY, scale: [0, p.scale, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      ))}
    </>
  );
}
