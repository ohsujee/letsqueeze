'use client';

import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApp } from 'firebase/app';
import MimeHostView from '@/components/game/MimeHostView';
import MimeGuesserView from '@/components/game/MimeGuesserView';
import AskerTransition from '@/components/game/AskerTransition';
import { usePlayers } from '@/lib/hooks/usePlayers';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import './play.css';

export function MimePlayContent({ code, myUid: devUid }) {
  useAppShellBg('#04060f');
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const db = getDatabase(getApp());

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [showMimerTransition, setShowMimerTransition] = useState(false);
  const [previousMimeUid, setPreviousMimeUid] = useState(null);

  // Wake lock

  // Players
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' });

  // Auth (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, [devUid]);

  // Firebase listeners
  useEffect(() => {
    if (!code) return;

    const metaRef = ref(db, `rooms_mime/${code}/meta`);
    const stateRef = ref(db, `rooms_mime/${code}/state`);

    const unsubMeta = onValue(metaRef, (snap) => {
      const data = snap.val();
      setMeta(data);
      if (data?.closed) {
        router.push('/home');
      }
    });

    const unsubState = onValue(stateRef, (snap) => {
      const data = snap.val();
      setState(data);
      // Redirection si fin de partie
      if (data?.phase === 'ended') {
        router.push(`/mime/game/${code}/end`);
      }
      // Redirection si retour au lobby
      if (data?.phase === 'lobby') {
        router.push(`/mime/room/${code}`);
      }
    });

    return () => {
      unsubMeta();
      unsubState();
    };
  }, [db, code, router]);

  // Déterminer si host
  useEffect(() => {
    if (myUid && meta?.hostUid) {
      setIsHost(myUid === meta.hostUid);
    }
  }, [myUid, meta?.hostUid]);

  // Premier mimeur : afficher transition AU PREMIER PAINT (useLayoutEffect = sync avant peinture)
  // → l'utilisateur ne voit jamais la vue de jeu sans la transition par-dessus
  useLayoutEffect(() => {
    if (state?.currentMimeUid && previousMimeUid === null) {
      setShowMimerTransition(true);
      setPreviousMimeUid(state.currentMimeUid);
    } else if (state?.currentMimeUid && state.currentMimeUid !== previousMimeUid) {
      // Mimeur a changé via advanceToNextWord — la transition a déjà été affichée
      // pendant transitionToUid (avant le swap), juste mémoriser le nouveau
      setPreviousMimeUid(state.currentMimeUid);
    }
  }, [state?.currentMimeUid, previousMimeUid]);

  // Auto-hide de la transition initiale après 2s (séparé du show pour éviter race)
  useEffect(() => {
    if (showMimerTransition && !state?.transitionToUid) {
      const t = setTimeout(() => setShowMimerTransition(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showMimerTransition, state?.transitionToUid]);

  // Transition pré-annoncée par announceNextMimer (avant le swap effectif)
  useEffect(() => {
    if (state?.transitionToUid) {
      setShowMimerTransition(true);
    } else {
      setShowMimerTransition(false);
    }
  }, [state?.transitionToUid]);

  if (!meta || !state || !myUid) {
    // Fond plein game color — même couleur que la transition AskerTransition
    // Pas de spinner visible, l'utilisateur voit juste le fond coloré
    // qui se fond directement avec la transition quand les données arrivent
    return (
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        background: '#059669',
      }} />
    );
  }

  // Suis-je le mimeur actuel?
  const isMimer = myUid === state.currentMimeUid;

  // Info du mimeur pour la transition :
  //   - Si transitionToUid est set → afficher le PROCHAIN mimeur (annonce)
  //   - Sinon → afficher le mimeur actuel (premier mimeur au mount)
  const transitionUid = state.transitionToUid || state.currentMimeUid;
  const transitionMimer = players.find(p => p.uid === transitionUid);
  const mimerAsker = transitionMimer ? {
    uid: transitionMimer.uid,
    name: transitionMimer.name,
  } : null;
  const isMeForTransition = myUid === transitionUid;

  // Afficher la vue appropriée
  return (
    <div className="mime-play">
      {/* Transition quand le mimeur change */}
      <AskerTransition
        show={showMimerTransition}
        asker={mimerAsker}
        isMe={isMeForTransition}
        onComplete={() => setShowMimerTransition(false)}
        game="mime"
        duration={2000}
      />

      {/* Vue mimeur ou vue devineur */}
      {isMimer ? (
        <MimeHostView
          code={code}
          isActualHost={isHost}
          myUid={myUid}
          devMode={!!devUid}
        />
      ) : (
        <MimeGuesserView
          code={code}
          myUid={myUid}
          devMode={!!devUid}
        />
      )}
    </div>
  );
}

export default function MimePlayPage() {
  const params = useParams();
  const code = params?.code;
  return <MimePlayContent code={code} />;
}
