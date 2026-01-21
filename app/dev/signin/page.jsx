'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

/**
 * DEV ONLY - Auto sign-in page
 * Usage: /api/dev/signin?uid=USER_UID
 */
export default function DevSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (!uid) {
      setStatus('Error: No UID provided');
      return;
    }

    async function signIn() {
      try {
        setStatus('Fetching token...');
        const response = await fetch(`/api/dev/auth?uid=${uid}`);
        const data = await response.json();

        if (!data.token) {
          setStatus('Error: ' + (data.error || 'No token received'));
          return;
        }

        setStatus('Signing in...');
        await signInWithCustomToken(auth, data.token);

        setStatus('Success! Redirecting...');
        setTimeout(() => {
          router.push('/home');
        }, 500);
      } catch (error) {
        setStatus('Error: ' + error.message);
      }
    }

    signIn();
  }, [uid, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: '#8b5cf6' }}>DEV Sign-In</h1>
      <p>UID: {uid || 'none'}</p>
      <p style={{ color: status.includes('Error') ? '#ef4444' : '#22c55e' }}>
        {status}
      </p>
    </div>
  );
}
