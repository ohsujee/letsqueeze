"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, ref, get, update, push, signInAnonymously, onAuthStateChanged } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Music, ArrowRight, Loader2 } from 'lucide-react';
import { storage } from '@/lib/utils/storage';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

const DEEZER_PURPLE = '#A238FF';

export default function DeezTestJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCode = searchParams.get('code') || '';

  const [code, setCode] = useState(prefilledCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);

  const { profile } = useUserProfile();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  // Auto-join if code is prefilled
  useEffect(() => {
    if (prefilledCode && uid) {
      handleJoin();
    }
  }, [prefilledCode, uid]);

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Entrez un code de room');
      return;
    }

    if (!uid) {
      setError('Connexion en cours...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const roomCode = code.trim().toUpperCase();
      const metaRef = ref(db, `rooms_deeztest/${roomCode}/meta`);
      const snap = await get(metaRef);

      if (!snap.exists()) {
        setError('❌ Code invalide ! Aucune partie trouvée avec ce code.');
        setLoading(false);
        return;
      }

      const meta = snap.val();

      // Check if room is still in lobby
      const stateRef = ref(db, `rooms_deeztest/${roomCode}/state`);
      const stateSnap = await get(stateRef);
      const state = stateSnap.val();

      if (state?.phase && state.phase !== 'lobby') {
        setError('La partie a déjà commencé');
        setLoading(false);
        return;
      }

      // Add player to room
      const playerName = profile?.pseudo || storage.get('playerName') || `Joueur${Math.floor(Math.random() * 1000)}`;

      const playersRef = ref(db, `rooms_deeztest/${roomCode}/players`);
      await update(playersRef, {
        [uid]: {
          uid,
          name: playerName,
          score: 0,
          joinedAt: Date.now(),
          isHost: meta.hostUid === uid,
        }
      });

      // Store for reconnection
      storage.set('lq_last_game', {
        type: 'deeztest',
        code: roomCode,
        joinedAt: Date.now(),
      });

      router.push(`/deeztest/room/${roomCode}`);
    } catch (err) {
      console.error('Join error:', err);
      setError('Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <div className="join-bg" />

      <main className="join-content">
        <motion.div
          className="join-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="join-icon">
            <Music size={40} />
          </div>

          <h1>Rejoindre une partie</h1>
          <p className="subtitle">Blind Test • Deezer</p>

          <div className="input-group">
            <input
              type="text"
              placeholder="Code de la room"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <motion.p
              className="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            className="join-btn"
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <>
                <span>Rejoindre</span>
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </motion.div>
      </main>

      <style jsx>{`
        .join-page {
          min-height: 100dvh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .join-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, ${DEEZER_PURPLE}22 0%, transparent 60%);
          pointer-events: none;
        }

        .join-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
        }

        .join-card {
          background: rgba(26, 26, 46, 0.9);
          border: 1px solid rgba(162, 56, 255, 0.3);
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
        }

        .join-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}33, ${DEEZER_PURPLE}11);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${DEEZER_PURPLE};
        }

        h1 {
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          color: white;
          margin-bottom: 4px;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group input {
          width: 100%;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(162, 56, 255, 0.3);
          border-radius: 12px;
          color: white;
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          text-align: center;
          letter-spacing: 0.2em;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          border-color: ${DEEZER_PURPLE};
        }

        .input-group input::placeholder {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          letter-spacing: normal;
          color: rgba(255, 255, 255, 0.3);
        }

        .error {
          color: #ff6b6b;
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .join-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, #FF0092);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

        .join-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
