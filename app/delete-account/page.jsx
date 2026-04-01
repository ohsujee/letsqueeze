'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { deleteUser } from 'firebase/auth';
import { ref, remove } from 'firebase/database';
import './delete-account.css';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError('');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Supprimer les données utilisateur dans Realtime DB
      try {
        await remove(ref(db, `users/${currentUser.uid}`));
      } catch (e) {
        console.warn('[deleteAccount] DB cleanup error:', e);
      }

      // Vider le localStorage
      localStorage.clear();

      // Supprimer le compte Firebase Auth
      await deleteUser(currentUser);

      router.push('/onboarding');
    } catch (err) {
      console.error('[deleteAccount] Error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Pour ta sécurité, déconnecte-toi et reconnecte-toi avant de supprimer ton compte.');
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-page">
      <div className="delete-bg" />

      <header className="delete-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Supprimer mon compte</h1>
      </header>

      <main className="delete-content">
        <div className="delete-icon">
          <Trash2 size={32} />
        </div>

        <h2>Suppression de compte</h2>

        <div className="warning-box">
          <AlertTriangle size={20} />
          <span>Cette action est irréversible</span>
        </div>

        <p className="info-text">
          La suppression de ton compte entraînera l'effacement définitif de :
        </p>

        <ul className="delete-list">
          <li>Ton profil et tes informations personnelles</li>
          <li>Ton historique de parties et tes scores</li>
          <li>Ton abonnement Gigglz Pro (si applicable)</li>
        </ul>

        {error && <p className="error-text">{error}</p>}

        <div className="confirm-section">
          <label className="confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>Je comprends que cette action est irréversible</span>
          </label>

          <button
            className="submit-btn"
            onClick={handleDeleteAccount}
            disabled={!confirmed || isDeleting}
          >
            <Trash2 size={18} />
            <span>{isDeleting ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}</span>
          </button>
        </div>
      </main>

    </div>
  );
}
