"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update, auth, onAuthStateChanged } from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Theater, Eye, EyeOff, Shield } from "lucide-react";
import { EndScreenFooter } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useToast } from "@/lib/hooks/useToast";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { storage } from "@/lib/utils/storage";
import { TROUVE_COLORS, getCategoryDisplayName, getDifficultyInfo } from "@/data/laregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const ACCENT = '#00e5ff';

/* ─── Result configs (4 states) ───────────────────────── */
const RESULTS = {
  enqueteur_win: {
    emoji: '🎉',
    title: 'TROUVÉ !',
    subtitle: 'Tu as percé le secret des civils',
    roleBadge: { icon: Search, label: 'Enquêteur', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', color: '#4ade80' },
    accent: '#4ade80',
    accentRgb: '34,197,94',
    outcomeLabel: 'Règle trouvée',
    outcomeIcon: Eye,
    glowRotate: -20,
  },
  enqueteur_lose: {
    emoji: '😤',
    title: 'RATÉ...',
    subtitle: 'La règle reste un mystère',
    roleBadge: { icon: Search, label: 'Enquêteur', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    accent: '#f87171',
    accentRgb: '239,68,68',
    outcomeLabel: '3 essais épuisés',
    outcomeIcon: EyeOff,
    glowRotate: 10,
  },
  civil_win: {
    emoji: '🎭',
    title: 'VICTOIRE !',
    subtitle: 'Les enquêteurs n\'ont rien vu',
    roleBadge: { icon: Theater, label: 'Civil', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', color: '#c084fc' },
    accent: '#c084fc',
    accentRgb: '168,85,247',
    outcomeLabel: 'Règle protégée',
    outcomeIcon: Shield,
    glowRotate: -10,
  },
  civil_lose: {
    emoji: '😢',
    title: 'GRILLÉ !',
    subtitle: 'Votre règle a été démasquée',
    roleBadge: { icon: Theater, label: 'Civil', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    accent: '#f87171',
    accentRgb: '239,68,68',
    outcomeLabel: 'Règle découverte',
    outcomeIcon: EyeOff,
    glowRotate: 15,
  },
};

/* ─── Animated Result Icon ────────────────────────────── */
function ResultIcon({ emoji, accentRgb, glowRotate, size = 90 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: glowRotate }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.25 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -18, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${accentRgb},0.55) 0%, transparent 65%)`,
          filter: 'blur(12px)',
        }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: -10, borderRadius: '50%',
          border: `1.5px dashed rgba(${accentRgb},0.2)`,
        }}
      />
      <div style={{
        fontSize: size * 0.72, textAlign: 'center', lineHeight: `${size}px`,
        position: 'relative', zIndex: 1,
        filter: `drop-shadow(0 0 18px rgba(${accentRgb},0.5))`,
      }}>
        {emoji}
      </div>
    </motion.div>
  );
}

/* ─── Attempts Dots ───────────────────────────────────── */
function AttemptsDots({ used, total = 3, accentRgb }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {Array.from({ length: total }).map((_, i) => {
        const isUsed = i < used;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isUsed ? 'rgba(239,68,68,0.25)' : `rgba(${accentRgb},0.9)`,
              border: isUsed ? '1.5px solid rgba(239,68,68,0.5)' : `1.5px solid rgba(${accentRgb},0.4)`,
              boxShadow: isUsed ? 'none' : `0 0 8px rgba(${accentRgb},0.6)`,
            }}
          />
        );
      })}
      <span style={{
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        fontSize: '0.65rem', fontWeight: 600,
        color: 'rgba(255,255,255,0.35)',
        marginLeft: '2px',
      }}>
        {used}/{total}
      </span>
    </div>
  );
}

/* ─── Difficulty Stars ────────────────────────────────── */
function DifficultyStars({ level, color }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i <= level ? color : 'rgba(255,255,255,0.12)',
        }} />
      ))}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────── */
export default function LaLoiEndPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [roomExists, setRoomExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const adShownRef = useRef(false);

  // User profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Players (snapshot on first load for stable end screen)
  const { players: livePlayers } = usePlayers({ roomCode: code, roomPrefix: 'rooms_laregle' });
  const playersSnapshotRef = useRef(null);
  if (livePlayers.length > 0 && playersSnapshotRef.current === null) {
    playersSnapshotRef.current = [...livePlayers];
  }
  const players = playersSnapshotRef.current || livePlayers;

  // Room guard
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion
  useGameCompletion({ gameType: 'laregle', roomCode: code });

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, [code]);

  // Interstitial ad
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;
    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[LaLoiEndPage] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_laregle/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) setRoomExists(false);
    });
    const u2 = onValue(ref(db, `rooms_laregle/${code}/state`), s => {
      setState(s.val());
    });
    return () => { u1(); u2(); };
  }, [code]);

  // Loading delay then show result
  useEffect(() => {
    if (state && meta) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setTimeout(() => setShowResult(true), 100);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, meta]);

  // Redirect if host returns to lobby
  useEffect(() => {
    if (myUid === null || meta === null) return;
    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && roomExists && meta && !meta.closed) {
      router.push(`/laregle/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, roomExists]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;

  // Role & outcome
  const myPlayer = players.find(p => p.uid === myUid);
  const isInvestigator = myPlayer?.role === 'investigator';
  const investigatorsWon = state?.foundByInvestigators;
  const iWon = (isInvestigator && investigatorsWon) || (!isInvestigator && !investigatorsWon);

  // Result config
  const resultKey = isInvestigator
    ? (investigatorsWon ? 'enqueteur_win' : 'enqueteur_lose')
    : (investigatorsWon ? 'civil_lose' : 'civil_win');
  const r = RESULTS[resultKey];

  // Attempts used
  const attemptsUsed = state?.guessAttempts || 0;

  // Rule metadata
  const currentRule = state?.currentRule;
  const ruleCategory = currentRule?.category ? getCategoryDisplayName(currentRule.category) : null;
  const ruleDifficulty = currentRule?.difficulty ? getDifficultyInfo(currentRule.difficulty) : null;

  // Back to lobby handler
  const handleBackToLobby = async () => {
    try {
      const updates = {};
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_laregle/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_laregle/${code}/players/${player.uid}/role`] = 'player';
        }
      });
      updates[`rooms_laregle/${code}/state`] = {
        phase: "lobby",
        investigatorUids: [],
        currentRule: null,
        ruleOptions: [],
        votes: {},
        rerollsUsed: 0,
        guessAttempts: 0,
        guesses: [],
        roundNumber: 1,
        playedRuleIds: state?.playedRuleIds || []
      };
      await update(ref(db), updates);
      router.push(`/laregle/room/${code}`);
    } catch (error) {
      console.error('Erreur retour lobby:', error);
      toast.error('Erreur lors du retour au lobby');
    }
  };

  // Background glow based on result
  const bgGlow = r
    ? (iWon
      ? `radial-gradient(ellipse at 50% 15%, rgba(${r.accentRgb},0.14) 0%, transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(${r.accentRgb},0.06) 0%, transparent 45%), #0a0a0f`
      : `radial-gradient(ellipse at 50% 15%, rgba(${r.accentRgb},0.11) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(${r.accentRgb},0.05) 0%, transparent 45%), #0a0a0f`)
    : `radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.15) 0%, transparent 50%), #0a0a0f`;

  /* ── Loading screen ── */
  if (isLoading) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0f', position: 'relative' }}>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.15) 0%, transparent 50%), #0a0a0f`,
        }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: `drop-shadow(0 0 20px ${ACCENT}80)` }}
            >
              🔍
            </motion.div>
            <p style={{
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              fontSize: '1.25rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem',
            }}>
              Calcul des résultats...
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay }}
                  style={{ width: '8px', height: '8px', borderRadius: '50%', background: CYAN_PRIMARY, display: 'block' }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Result screen ── */
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0f', position: 'relative' }}>

      {/* Background glow */}
      <motion.div
        key={resultKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: bgGlow }}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{
            maxWidth: '500px', margin: '0 auto',
            padding: '1.75rem 1.25rem 2rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>

            {/* ── Role badge ── */}
            <AnimatePresence mode="wait">
              {showResult && r && (
                <motion.div
                  key={`badge-${resultKey}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ display: 'flex', justifyContent: 'center' }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '6px 14px',
                    background: r.roleBadge.bg,
                    border: `1px solid ${r.roleBadge.border}`,
                    borderRadius: '20px',
                  }}>
                    <r.roleBadge.icon size={14} style={{ color: r.roleBadge.color }} />
                    <span style={{
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '0.75rem', fontWeight: 700,
                      color: r.roleBadge.color,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {r.roleBadge.label}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Result card ── */}
            <AnimatePresence mode="wait">
              {showResult && r && (
                <motion.div
                  key={`card-${resultKey}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.15 }}
                  style={{
                    position: 'relative',
                    background: 'rgba(12,14,28,0.92)',
                    borderRadius: '22px',
                    padding: '2.25rem 1.75rem 2rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    overflow: 'hidden',
                    border: `1.5px solid rgba(${r.accentRgb},0.3)`,
                    boxShadow: `0 0 50px rgba(${r.accentRgb},0.15), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
                  }}
                >
                  {/* Glow interne */}
                  <div style={{
                    position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
                    width: '180%', height: '180%', pointerEvents: 'none',
                    background: `radial-gradient(circle, rgba(${r.accentRgb},0.15) 0%, transparent 50%)`,
                  }} />

                  {/* Noise texture */}
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '128px 128px',
                  }} />

                  {/* Icon */}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <ResultIcon
                      emoji={r.emoji}
                      accentRgb={r.accentRgb}
                      glowRotate={r.glowRotate}
                      size={90}
                    />
                  </div>

                  {/* Title */}
                  <motion.h1
                    initial={{ y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
                    style={{
                      position: 'relative', zIndex: 1,
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: 'clamp(2rem, 10vw, 2.75rem)',
                      fontWeight: 400, margin: '0 0 0.5rem',
                      textTransform: 'uppercase',
                      color: r.accent,
                      textShadow: `0 0 28px rgba(${r.accentRgb},0.55), 0 0 56px rgba(${r.accentRgb},0.25)`,
                    }}
                  >
                    {r.title}
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    style={{
                      position: 'relative', zIndex: 1,
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '1.05rem', fontWeight: 500,
                      color: 'rgba(255,255,255,0.75)', margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {r.subtitle}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Outcome + Attempts row ── */}
            <AnimatePresence mode="wait">
              {showResult && r && (
                <motion.div
                  key={`stats-${resultKey}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(12,14,28,0.85)',
                    border: `1px solid rgba(${r.accentRgb},0.15)`,
                    borderRadius: '14px',
                    padding: '14px 18px',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    gap: '14px',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '10px',
                    background: `rgba(${r.accentRgb},0.12)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <r.outcomeIcon size={18} style={{ color: r.accent }} />
                  </div>

                  <div style={{
                    flex: 1,
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    fontSize: '0.85rem', fontWeight: 600,
                    color: r.accent,
                  }}>
                    {r.outcomeLabel}
                  </div>

                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}>
                    <span style={{
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '0.55rem', fontWeight: 600,
                      color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      Essais
                    </span>
                    <AttemptsDots used={attemptsUsed} total={3} accentRgb={r.accentRgb} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Rule card ── */}
            <AnimatePresence mode="wait">
              {showResult && currentRule && r && (
                <motion.div
                  key={`rule-${resultKey}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    position: 'relative',
                    background: `rgba(${r.accentRgb},0.06)`,
                    border: `1.5px solid rgba(${r.accentRgb},0.2)`,
                    borderRadius: '16px',
                    padding: '20px 22px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
                    background: `linear-gradient(90deg, transparent, rgba(${r.accentRgb},0.4), transparent)`,
                  }} />

                  {/* Label row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <span style={{
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '0.65rem', fontWeight: 700,
                      color: 'rgba(255,255,255,0.45)',
                      textTransform: 'uppercase', letterSpacing: '0.15em',
                    }}>
                      La règle était
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ruleCategory && (
                        <span style={{
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          fontSize: '0.6rem', fontWeight: 600,
                          color: `rgba(${r.accentRgb},0.7)`,
                          padding: '2px 8px',
                          background: `rgba(${r.accentRgb},0.1)`,
                          borderRadius: '6px',
                        }}>
                          {ruleCategory}
                        </span>
                      )}
                      {ruleDifficulty && (
                        <DifficultyStars level={ruleDifficulty.stars} color={`rgba(${r.accentRgb},0.6)`} />
                      )}
                    </div>
                  </div>

                  {/* Rule text */}
                  <p style={{
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    fontSize: '1.15rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    margin: 0, lineHeight: 1.5,
                    textAlign: 'center',
                  }}>
                    {currentRule.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Footer */}
        {showResult && r && (
          <EndScreenFooter
            gameColor={r.accent}
            label={!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
            onNewGame={() => {
              if (!hostPresent) {
                router.push('/home');
              } else if (isHost) {
                handleBackToLobby();
              } else {
                router.push(`/laregle/room/${code}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
