'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApp } from 'firebase/app';
import MimeHostView from '@/components/game/MimeHostView';
import MimeGuesserView from '@/components/game/MimeGuesserView';
import AskerTransition from '@/components/game/AskerTransition';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { usePlayers } from '@/lib/hooks/usePlayers';
import './play.css';

export default function MimePlayPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code;
  const db = getDatabase(getApp());

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [showMimerTransition, setShowMimerTransition] = useState(false);
  const [previousMimeUid, setPreviousMimeUid] = useState(null);

  // Wake lock
  useWakeLock({ enabled: true });

  // Players
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' });

  // Auth
  useEffect(() => {
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Firebase listeners
  useEffect(() => {
    if (!code) return;

    const metaRef = ref(db, `rooms_mime/${code}/meta`);
    const stateRef = ref(db, `rooms_mime/${code}/state`);

    const unsubMeta = onValue(metaRef, (snap) => {
      const data = snap.val();
      setMeta(data);
      if (data?.closed) {
        router.push('/');
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

  // Détecter changement de mimeur pour afficher transition
  useEffect(() => {
    if (state?.currentMimeUid && state.currentMimeUid !== previousMimeUid) {
      // Ne pas afficher au premier chargement
      if (previousMimeUid !== null) {
        setShowMimerTransition(true);
        setTimeout(() => setShowMimerTransition(false), 2000);
      }
      setPreviousMimeUid(state.currentMimeUid);
    }
  }, [state?.currentMimeUid, previousMimeUid]);

  if (!meta || !state || !myUid) {
    return (
      <div className="mime-play loading">
        <div className="loader" />
      </div>
    );
  }

  // Suis-je le mimeur actuel?
  const isMimer = myUid === state.currentMimeUid;

  // Info du mimeur actuel pour la transition
  const currentMimer = players.find(p => p.uid === state.currentMimeUid);
  const mimerAsker = currentMimer ? {
    uid: currentMimer.uid,
    name: currentMimer.name,
  } : null;

  // Afficher la vue appropriée
  return (
    <div className="mime-play">
      {/* Transition quand le mimeur change */}
      <AskerTransition
        show={showMimerTransition}
        asker={mimerAsker}
        isMe={isMimer}
        onComplete={() => setShowMimerTransition(false)}
        game="mime"
        duration={2000}
      />

      {/* Vue mimeur ou vue devineur */}
      {isMimer ? (
        <MimeHostView
          code={code}
          isActualHost={isHost}
        />
      ) : (
        <MimeGuesserView
          code={code}
          myUid={myUid}
        />
      )}
    </div>
  );
}
