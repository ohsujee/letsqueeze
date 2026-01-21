import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Fake player names for seeding
const FAKE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Émile', 'Fatou', 'Gaston', 'Hélène'];

// ============================================
// FIREBASE ADMIN INITIALIZATION
// ============================================

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !databaseURL) {
    console.error('[DevSeed] Missing Firebase configuration');
    return null;
  }

  if (clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
      console.log('[DevSeed] Firebase Admin initialized');
      return admin.apps[0];
    } catch (error) {
      console.error('[DevSeed] Failed to initialize Firebase Admin:', error);
      return null;
    }
  }

  return null;
}

// ============================================
// SECURITY CHECK
// ============================================

function isDevelopment(request) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const host = request.headers.get('host') || '';
  const origin = request.headers.get('origin') || '';

  return host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');
}

/**
 * DEV ONLY - API pour simuler des joueurs dans une room
 *
 * Actions disponibles:
 * - seed: Ajouter des faux joueurs
 * - updateScore: Modifier le score d'un joueur
 * - disconnect: Marquer un joueur comme déconnecté
 * - reconnect: Remettre un joueur en actif
 * - inactive: Marquer un joueur comme inactif
 * - clear: Supprimer tous les faux joueurs
 * - list: Lister les joueurs
 */
export async function POST(request) {
  // Security: Only allow in development
  if (!isDevelopment(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
  }

  const db = admin.database();

  try {
    const body = await request.json();
    const {
      roomCode,
      prefix = 'rooms',
      action = 'seed',
      players,
      playerUid,
      score,
      count = 5
    } = body;

    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode required' }, { status: 400 });
    }

    const playersRef = db.ref(`${prefix}/${roomCode}/players`);

    switch (action) {
      case 'seed': {
        // Create fake players
        const fakePlayers = players || FAKE_NAMES.slice(0, count).map((name, i) => ({
          name,
          score: Math.floor(Math.random() * 200)
        }));

        const updates = {};
        fakePlayers.forEach((p, i) => {
          const uid = `fake_${p.name.toLowerCase().replace(/[^a-z]/g, '')}`;
          updates[uid] = {
            uid,
            name: p.name,
            score: p.score ?? 0,
            status: 'active',
            activityStatus: 'active',
            joinedAt: Date.now() - (i * 1000),
            isFake: true
          };
        });

        await playersRef.update(updates);
        return NextResponse.json({
          success: true,
          action: 'seed',
          players: Object.keys(updates)
        });
      }

      case 'updateScore': {
        if (!playerUid || score === undefined) {
          return NextResponse.json({ error: 'playerUid and score required' }, { status: 400 });
        }
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}/score`).set(score);
        return NextResponse.json({ success: true, action: 'updateScore', playerUid, score });
      }

      case 'disconnect': {
        if (!playerUid) {
          return NextResponse.json({ error: 'playerUid required' }, { status: 400 });
        }
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}/status`).set('disconnected');
        return NextResponse.json({ success: true, action: 'disconnect', playerUid });
      }

      case 'reconnect': {
        if (!playerUid) {
          return NextResponse.json({ error: 'playerUid required' }, { status: 400 });
        }
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}/status`).set('active');
        return NextResponse.json({ success: true, action: 'reconnect', playerUid });
      }

      case 'inactive': {
        if (!playerUid) {
          return NextResponse.json({ error: 'playerUid required' }, { status: 400 });
        }
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}/activityStatus`).set('inactive');
        return NextResponse.json({ success: true, action: 'inactive', playerUid });
      }

      case 'clear': {
        const snapshot = await playersRef.get();
        if (snapshot.exists()) {
          const playersData = snapshot.val();
          const updates = {};
          Object.keys(playersData).forEach(uid => {
            if (playersData[uid].isFake) {
              updates[uid] = null;
            }
          });
          if (Object.keys(updates).length > 0) {
            await playersRef.update(updates);
          }
        }
        return NextResponse.json({ success: true, action: 'clear' });
      }

      case 'list': {
        const snapshot = await playersRef.get();
        const playersData = snapshot.exists() ? snapshot.val() : {};
        return NextResponse.json({
          success: true,
          players: Object.values(playersData).map(p => ({
            uid: p.uid,
            name: p.name,
            score: p.score,
            status: p.status,
            isFake: p.isFake || false
          }))
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (error) {
    console.error('[DevSeed] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Quick status/list
export async function GET(request) {
  if (!isDevelopment(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode');
  const prefix = searchParams.get('prefix') || 'rooms';

  if (!roomCode) {
    return NextResponse.json({
      info: 'DEV API for seeding fake players',
      actions: ['seed', 'updateScore', 'disconnect', 'reconnect', 'inactive', 'clear', 'list'],
      usage: 'POST with { roomCode, prefix, action, ... }'
    });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
  }

  const db = admin.database();
  const snapshot = await db.ref(`${prefix}/${roomCode}/players`).get();
  const playersData = snapshot.exists() ? snapshot.val() : {};

  return NextResponse.json({
    roomCode,
    prefix,
    players: Object.values(playersData).map(p => ({
      uid: p.uid,
      name: p.name,
      score: p.score,
      status: p.status,
      isFake: p.isFake || false
    }))
  });
}
