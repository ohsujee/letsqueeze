"use client";
import { motion } from "framer-motion";

export function TransitionIcon({ type, color, glowColor, step }) {
  const size = 120;
  const icons = {
    trophy: <TrophyIcon size={size} color={color} glowColor={glowColor} />,
    music: <MusicIcon size={size} color={color} glowColor={glowColor} />,
    folder: <FolderIcon size={size} color={color} glowColor={glowColor} />,
    lightbulb: <LightbulbIcon size={size} color={color} glowColor={glowColor} />,
    theater: <TheaterIcon size={size} color={color} glowColor={glowColor} />,
    brain: <BrainIcon size={size} color={color} glowColor={glowColor} />,
    brainEmoji: <BrainEmojiIcon size={size} glowColor={glowColor} />,
  };
  return (
    <motion.div className="transition-icon" initial={{ scale: 0, rotate: -10 }} animate={step >= 1 ? { scale: 1, rotate: 0 } : {}} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }} style={{ marginBottom: "1.5rem" }}>
      {icons[type] || icons.trophy}
    </motion.div>
  );
}

function GlowBg({ glowColor, inset = -25, blur = 15, scale = [1, 1.15, 1], opacity = [0.5, 0.8, 0.5], dur = 2 }) {
  return (
    <motion.div animate={{ scale, opacity }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", inset, borderRadius: "50%", background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: `blur(${blur}px)` }} />
  );
}

function TrophyIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M12 17V14M12 14C14.5 14 16 12 16 9V4H8V9C8 12 9.5 14 12 14Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
        <motion.path d="M16 5H18C19 5 20 6 20 7C20 9 18 10 16 10" stroke="white" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
        <motion.path d="M8 5H6C5 5 4 6 4 7C4 9 6 10 8 10" stroke="white" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
        <motion.path d="M9 21H15M12 17V21" stroke="white" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.7 }} />
        <motion.path d="M12 7L12.5 8.5H14L12.75 9.5L13.25 11L12 10L10.75 11L11.25 9.5L10 8.5H11.5L12 7Z" fill={glowColor} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9, type: "spring" }} />
      </svg>
    </div>
  );
}

function MusicIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M7 19V8M17 17V6" stroke="white" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
        <motion.path d="M7 8L17 6M7 11L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.5 }} />
        <motion.ellipse cx="5" cy="19" rx="3" ry="2.5" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transform="rotate(-20 5 19)" transition={{ delay: 0.7, type: "spring" }} />
        <motion.ellipse cx="15" cy="17" rx="3" ry="2.5" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transform="rotate(-20 15 17)" transition={{ delay: 0.8, type: "spring" }} />
      </svg>
    </div>
  );
}

function FolderIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} inset={-20} opacity={[0.4, 0.7, 0.4]} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M3 6C3 5 4 4 5 4H9L11 6H19C20 6 21 7 21 8V18C21 19 20 20 19 20H5C4 20 3 19 3 18V6Z" fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} />
        <motion.line x1="7" y1="11" x2="17" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.3 }} />
        <motion.line x1="7" y1="14" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.3 }} />
        <motion.line x1="7" y1="17" x2="11" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.3 }} />
        <motion.path d="M14 15L16 17L20 13" stroke={glowColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 1, duration: 0.4 }} />
      </svg>
    </div>
  );
}

function LightbulbIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} inset={-15} blur={20} scale={[1, 1.2, 1]} opacity={[0.5, 0.9, 0.5]} dur={1.5} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M12 2C8.5 2 6 5 6 8C6 10.5 7.5 12.5 9 14V17H15V14C16.5 12.5 18 10.5 18 8C18 5 15.5 2 12 2Z" fill={color} stroke="white" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} />
        <motion.rect x="9" y="17" width="6" height="2" rx="1" fill="white" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5 }} />
        <motion.rect x="9" y="20" width="6" height="2" rx="1" fill="white" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6 }} />
      </svg>
    </div>
  );
}

function TheaterIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M7 8C5.5 8 4 9.5 4 11.5C4 14.5 6 16 8 16C10 16 11 14 11 12V6C11 6 9 6 7 8Z" fill={color} stroke="white" strokeWidth="1.5" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: "spring" }} />
        <motion.circle cx="6.5" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
        <motion.circle cx="9" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
        <motion.path d="M6 12.5C6.5 13.5 7.5 14 8 13.5" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.3 }} />
        <motion.path d="M17 8C18.5 8 20 9.5 20 11.5C20 14.5 18 16 16 16C14 16 13 14 13 12V6C13 6 15 6 17 8Z" fill={color} stroke="white" strokeWidth="1.5" initial={{ scale: 0, rotate: 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: "spring" }} />
        <motion.circle cx="15" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        <motion.circle cx="17.5" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        <motion.path d="M15 14C15.5 13 16.5 12.5 17 13" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.3 }} />
        <motion.path d="M8 4C10 3 14 3 16 4" stroke={glowColor} strokeWidth="2" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.4 }} />
        <motion.path d="M8 4L6 6M16 4L18 6" stroke={glowColor} strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.3 }} />
      </svg>
    </div>
  );
}

function BrainEmojiIcon({ size, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlowBg glowColor={glowColor} inset={-20} scale={[1, 1.2, 1]} opacity={[0.4, 0.8, 0.4]} />
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }} style={{ fontSize: size * 0.7, lineHeight: 1 }}>🧠</motion.span>
    </div>
  );
}

function BrainIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <GlowBg glowColor={glowColor} inset={-20} scale={[1, 1.2, 1]} opacity={[0.5, 0.9, 0.5]} />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path d="M12 4C10 4 8.5 5 7.5 6.5C6 6.5 4.5 7.5 4.5 9.5C3.5 10 3 11 3 12.5C3 14 4 15.5 5.5 16C5.5 17.5 7 19 9 19C10 19 11 18.5 12 18" stroke="white" strokeWidth="2" strokeLinecap="round" fill={color} fillOpacity="0.3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
        <motion.path d="M12 4C14 4 15.5 5 16.5 6.5C18 6.5 19.5 7.5 19.5 9.5C20.5 10 21 11 21 12.5C21 14 20 15.5 18.5 16C18.5 17.5 17 19 15 19C14 19 13 18.5 12 18" stroke="white" strokeWidth="2" strokeLinecap="round" fill={color} fillOpacity="0.3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
        <motion.path d="M12 4V18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.6 }} />
        <motion.circle cx="12" cy="11" r="2" fill={glowColor} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8] }} transition={{ delay: 0.9, duration: 0.5 }} />
      </svg>
    </div>
  );
}
