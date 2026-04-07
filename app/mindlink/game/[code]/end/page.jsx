"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { recordMindlinkGame } from "@/lib/services/statsService";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useToast } from "@/lib/hooks/useToast";
import { ShieldStar, Sword, Trophy, Timer, ArrowLeft, ArrowsClockwise } from '@phosphor-icons/react';
import WordDisplay from '@/components/game/WordDisplay';
import './mindlink-end.css';

const ACCENT = '#ec4899';
const ACCENT_DARK = '#db2777';
const ROOM_PREFIX = 'rooms_mindlink';

const RESULTS = {
  attackers: {
    emoji: '🧠',
    title: 'TROUVÉ !',
    subtitle: 'Le mot a été percé à jour',
    accent: '#22c55e',
  },
  defenders: {
    emoji: '🛡️',
    title: 'DÉFENDU !',
    subtitle: 'Le mot reste un mystère',
    accent: '#ec4899',
  },
};

const WIN_REASONS = {
  guessed: 'Mot deviné directement',
  all_letters: 'Toutes les lettres révélées',
  found_during_link: 'Mot trouvé pendant un link',
  timeout: 'Temps écoulé',
};

export function MindLinkEndContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const loadTimerRef = useRef(null);

  const adShownRef = useRef(false);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  useGameCompletion({ gameType: devUid ? null : 'mindlink', roomCode: devUid ? null : code });
  const { currentUser, profile, loading: profileLoading } = useUserProfile();
  const userIsPro = isPro(profile);

  // Show interstitial ad (non-Pro users)
  useEffect(() => {
    if (devUid || adShownRef.current || profileLoading) return;
    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[MindLinkEnd] Interstitial ad error:', err);
        });
      });
    }
  }, [devUid, currentUser, userIsPro, profileLoading]);

  // Auth
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
    });
    return () => unsub();
  }, [devUid]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, enabled: !devUid });

  // Listen meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        setMeta(m);
        if (myUid) setIsHost(m.hostUid === myUid);
      }
      if (m?.closed) router.push('/home');
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const s = snap.val();
      if (s) setState(s);
      // Redirect if phase goes back to lobby
      if (s?.phase === 'lobby') router.push(`/mindlink/room/${code}`);
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, myUid, router]);

  // Delay content reveal
  useEffect(() => {
    loadTimerRef.current = setTimeout(() => setShowContent(true), 1500);
    return () => clearTimeout(loadTimerRef.current);
  }, []);

  const handleNewGame = async () => {
    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), { phase: 'lobby' });
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erreur');
    }
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  // Loading
  if (!meta || !state) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#04060f', alignItems: 'center', justifyContent: 'center', gap: '14px',
      }}>
        <div style={{
          width: 30, height: 30,
          border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
      </div>
    );
  }

  const winner = state.winner || 'defenders';
  const result = RESULTS[winner];
  const myPlayer = players.find(p => p.uid === myUid);
  const myRole = myPlayer?.role || 'attacker';
  const iWon = (myRole === 'attacker' && winner === 'attackers') || (myRole === 'defender' && winner === 'defenders');

  // Record individual stats
  const statsRecordedRef = useRef(false);
  useEffect(() => {
    if (statsRecordedRef.current || !myUid || !meta || !myPlayer) return;
    if (myUid === meta.hostUid) { statsRecordedRef.current = true; return; }
    statsRecordedRef.current = true;
    recordMindlinkGame({ won: iWon });
  }, [myUid, meta, myPlayer, iWon]);

  const winReason = WIN_REASONS[state.winReason] || '';
  const secretWord = state.secretWord || '???';

  const defenders = players.filter(p => p.role === 'defender');
  const attackers = players.filter(p => p.role === 'attacker');

  // Calculation animation
  if (!showContent) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#04060f', alignItems: 'center', justifyContent: 'center', gap: '16px',
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `3px solid rgba(236,72,153,0.15)`,
            borderTopColor: ACCENT,
          }}
        />
        <div style={{ fontSize: '0.85rem', color: 'rgba(238,242,255,0.4)', fontWeight: 600 }}>
          Calcul des résultats…
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>
      {/* Background */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', height: '350px',
          background: `radial-gradient(ellipse at 50% 0%, ${result.accent}15 0%, transparent 70%)`,
        }} />
      </div>

      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 16px',
        position: 'relative', zIndex: 1,
        gap: '20px',
      }}>

        {/* Result icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `radial-gradient(circle, ${result.accent}22, transparent)`,
            border: `2px solid ${result.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem',
            boxShadow: `0 0 40px ${result.accent}33`,
          }}
        >
          {result.emoji}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: '1.5rem', color: result.accent,
            textShadow: `0 0 20px ${result.accent}66`,
            marginBottom: '6px',
          }}>
            {result.title}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)' }}>
            {result.subtitle}
          </p>
        </motion.div>

        {/* Your outcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', borderRadius: '20px',
            background: iWon ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${iWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {myRole === 'defender' ? (
            <ShieldStar size={16} weight="fill" color={ACCENT} />
          ) : (
            <Sword size={16} weight="fill" color={ACCENT} />
          )}
          <span style={{
            fontSize: '0.82rem', fontWeight: 700,
            color: iWon ? '#22c55e' : '#ef4444',
          }}>
            {iWon ? 'Tu as gagné !' : 'Tu as perdu…'}
          </span>
        </motion.div>

        {/* Secret word reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            fontSize: '0.68rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            Le mot secret
          </div>
          <WordDisplay
            wordLength={secretWord.length}
            revealedLetters={secretWord.length}
            fullWord={secretWord}
            showAll={true}
          />

          {winReason && (
            <div style={{
              marginTop: '12px', fontSize: '0.75rem',
              color: 'rgba(238,242,255,0.4)',
            }}>
              {winReason}
            </div>
          )}
        </motion.div>

        {/* Teams recap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            width: '100%', maxWidth: '360px',
            display: 'flex', gap: '10px',
          }}
        >
          {/* Defenders */}
          <div style={{
            flex: 1,
            background: 'rgba(8,14,32,0.92)',
            border: '1px solid rgba(236,72,153,0.12)',
            borderRadius: '14px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.68rem', fontWeight: 700, color: ACCENT,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              <ShieldStar size={12} weight="fill" />
              Défenseurs
            </div>
            {defenders.map(p => (
              <div key={p.uid} style={{
                fontSize: '0.78rem', color: '#eef2ff', fontWeight: 600,
                padding: '3px 0',
              }}>
                {p.name} {p.uid === myUid && <span style={{ color: ACCENT }}>•</span>}
              </div>
            ))}
          </div>

          {/* Attackers */}
          <div style={{
            flex: 1,
            background: 'rgba(8,14,32,0.92)',
            border: '1px solid rgba(238,242,255,0.07)',
            borderRadius: '14px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.68rem', fontWeight: 700, color: 'rgba(238,242,255,0.5)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              <Sword size={12} weight="fill" />
              Attaquants
            </div>
            {attackers.map(p => (
              <div key={p.uid} style={{
                fontSize: '0.78rem', color: '#eef2ff', fontWeight: 600,
                padding: '3px 0',
              }}>
                {p.name} {p.uid === myUid && <span style={{ color: ACCENT }}>•</span>}
              </div>
            ))}
          </div>
        </motion.div>

      </main>

      {/* Footer */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(238,242,255,0.05)',
        flexShrink: 0,
        display: 'flex', gap: '10px',
        background: 'rgba(4,6,15,0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGoHome}
          style={{
            flex: 1, padding: '14px', borderRadius: '14px',
            background: 'rgba(238,242,255,0.06)',
            border: '1px solid rgba(238,242,255,0.1)',
            color: 'rgba(238,242,255,0.6)',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <ArrowLeft size={16} weight="bold" />
          Accueil
        </motion.button>

        {isHost ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewGame}
            style={{
              flex: 2, padding: '14px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              border: 'none', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
              boxShadow: `0 4px 20px ${ACCENT}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <ArrowsClockwise size={18} weight="bold" />
            Nouvelle partie
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/mindlink/room/${code}`)}
            style={{
              flex: 2, padding: '14px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              border: 'none', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
              boxShadow: `0 4px 20px ${ACCENT}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <ArrowLeft size={16} weight="bold" />
            Retour au lobby
          </motion.button>
        )}
      </div>

    </div>
  );
}

export default function MindLinkEndPage() {
  const { code } = useParams();
  return <MindLinkEndContent code={code} />;
}
