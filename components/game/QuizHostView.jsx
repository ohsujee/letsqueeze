"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, onValue, update, serverTimestamp } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useServerTime } from "@/lib/hooks/useServerTime";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import HostDisconnectAlert from "@/components/game/HostDisconnectAlert";
import BuzzValidationModal from "@/components/game/BuzzValidationModal";
import { hueScenariosService } from "@/lib/hue-module";
import { GameEndTransition } from "@/components/transitions";
import QuestionCard from "@/components/game/QuestionCard";
import HostActionFooter from "@/components/game/HostActionFooter";
import ReportQuestionModal from "@/components/game/ReportQuestionModal";
import { useQuizActions } from "@/lib/hooks/useQuizActions";
import { push, set } from "firebase/database";
import './QuizHostView.css';

/**
 * QuizHostView - Shared component for Quiz host view
 * Used by both the host page and the play page (when player is the asker in Party Mode)
 */
export default function QuizHostView({ code, isActualHost = true, onAdvanceAsker, onExit }) {
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [conf, setConf] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });
  const { serverNow, offset: serverOffset } = useServerTime(300);
  const myUid = auth.currentUser?.uid;
  const canControl = isActualHost || (meta?.gameMasterMode === 'party' && state?.currentAskerUid === myUid);

  // Load scoring config
  useEffect(() => {
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  }, []);

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms/${code}/quiz`), s => setQuiz(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Redirect actual host to play page in Party Mode
  useEffect(() => {
    if (isActualHost && meta?.gameMasterMode === 'party') router.replace(`/game/${code}/play`);
  }, [isActualHost, meta?.gameMasterMode, code, router]);

  // Redirect on phase change
  useEffect(() => {
    if (state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state?.phase === "lobby") router.replace(`/room/${code}`);
  }, [state?.phase, router, code]);

  // Hue ambiance on load (actual host only)
  useEffect(() => {
    if (isActualHost) hueScenariosService.trigger('gigglz', 'ambiance');
  }, [isActualHost]);

  // Room guard + host disconnect
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: 'rooms', playerUid: myUid, isHost: isActualHost
  });
  const { isHostMarkedDisconnected: isHostDisconnected, isFirebaseConnected, forceReconnect } = useHostDisconnect({
    roomCode: code, roomPrefix: 'rooms', hostUid: meta?.hostUid
  });

  // Derived
  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex + 1, total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Points calculation
  const elapsedEffective = useMemo(() => {
    if (!state?.revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [state?.revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(() => {
    if (!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.round(c.floor + (c.start - c.floor) * ratio);
    return { pointsEnJeu: pts, ratioRemain: ratio, cfg: c };
  }, [conf, q, elapsedEffective]);

  // Game actions (buzz system, sounds, validate/wrong/skip/etc.)
  const { revealToggle, resetBuzzers, validate, wrong, skip, end, isTransitioning } = useQuizActions({
    code, state, meta, quiz, players, conf, canControl,
    pointsEnJeu, ratioRemain, total,
    onAdvanceAsker, serverOffset,
  });

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "-";

  async function exitAndEndGame() {
    if (code && isActualHost) await update(ref(db, `rooms/${code}/meta`), { closed: true });
    router.push('/home');
  }

  async function handleReport({ reportTypes, customText }) {
    if (!q || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const questionId = q.id || `q_${qIndex}`;
      const rawThemeId = quiz?.id || meta?.quizId || '';
      const themeId = rawThemeId.split('+')[0];

      await push(ref(db, 'quiz_reports'), {
        questionId, themeId, themeTitle: quiz?.title || themeId,
        questionText: q.question, answerText: q.answer || '',
        reportTypes, customText: customText || '',
        roomCode: code, reporterUid: myUid || 'anonymous',
        timestamp: serverTimestamp(), status: 'open',
      });

      if (q.id) await set(ref(db, `unavailable_questions/${q.id}`), true);

      const themeIds = quiz?.id?.split('+') || meta?.quizSelection?.themeIds || [];
      const usedIds = new Set((quiz?.items || []).map(item => item.id).filter(Boolean));
      let replacement = null;

      for (const tid of themeIds) {
        try {
          const res = await fetch(`/data/quiz/${tid}.json`);
          const data = await res.json();
          const candidates = (data?.items || []).filter(item => item.id && !usedIds.has(item.id));
          if (candidates.length > 0) {
            replacement = candidates[Math.floor(Math.random() * candidates.length)];
            break;
          }
        } catch (err) { console.warn(`Failed to load theme ${tid}:`, err); }
      }

      if (replacement) {
        await update(ref(db, `rooms/${code}/quiz`), { [`items/${qIndex}`]: replacement });
      }
      setShowReportModal(false);
    } catch (err) {
      console.error('Erreur signalement:', err);
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <div className="host-game-page game-page">
      <AnimatePresence>
        {isTransitioning && (
          <motion.div className="party-transition-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition variant="quiz" onComplete={() => router.replace(`/end/${code}`)} />
        )}
      </AnimatePresence>

      <header className="game-header">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress">{progressLabel}</div>
            <div className="game-header-title">{title}</div>
          </div>
          <div className="game-header-right">
            {isActualHost && (
              <PlayerManager players={players} roomCode={code} roomPrefix="rooms" hostUid={meta?.hostUid} variant="quiz" phase="playing" />
            )}
            <ExitButton
              variant="header"
              confirmMessage={isActualHost
                ? "Voulez-vous vraiment quitter ? La partie sera abandonnee pour tous les joueurs."
                : "Voulez-vous vraiment quitter ? Votre score sera conservé."
              }
              onExit={isActualHost ? exitAndEndGame : (onExit || (() => router.push('/home')))}
            />
          </div>
        </div>
      </header>

      <BuzzValidationModal
        isOpen={!!state?.lockUid} playerName={lockedName} gameColor="#8b5cf6"
        answerLabel="Réponse attendue" answerValue={q?.answer} points={pointsEnJeu}
        onCorrect={validate} onWrong={wrong} onCancel={resetBuzzers}
      />

      <main className="game-content">
        <QuestionCard
          question={q?.question} answer={q?.answer} points={pointsEnJeu}
          questionIndex={qIndex} isEmpty={!q}
          onReport={q ? () => setShowReportModal(true) : undefined}
        />
        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      <HostActionFooter revealed={state?.revealed} onRevealToggle={revealToggle} onSkip={skip} onEnd={end} />

      <GameStatusBanners isHost={isActualHost} isHostTemporarilyDisconnected={isHostTemporarilyDisconnected} hostDisconnectedAt={hostDisconnectedAt} />
      <ReportQuestionModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={handleReport} submitting={reportSubmitting} />

      {isActualHost && (
        <HostDisconnectAlert isDisconnected={isHostDisconnected} isFirebaseConnected={isFirebaseConnected} onReconnect={forceReconnect} />
      )}
    </div>
  );
}
