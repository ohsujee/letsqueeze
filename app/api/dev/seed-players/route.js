import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Fake player names for seeding
const FAKE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Emile', 'Fatou', 'Gaston', 'Helene'];

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
 * - disconnect: Marquer un joueur comme déconnecté (status: 'disconnected')
 * - reconnect: Remettre un joueur en actif
 * - inactive: Marquer un joueur comme inactif
 * - kick: Exclusion par host (écrit kickedPlayers puis supprime) → redirect home sans rejoin
 * - remove: Simulation déconnexion réseau (supprime sans kickedPlayers) → LobbyDisconnectAlert avec rejoin
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

      case 'updateTeamScores': {
        // Update team scores for testing team leaderboard
        const { teamScores } = body;
        if (!teamScores || typeof teamScores !== 'object') {
          return NextResponse.json({ error: 'teamScores object required (e.g., {"team1": 100, "team2": 50})' }, { status: 400 });
        }
        const updates = {};
        Object.entries(teamScores).forEach(([teamId, teamScore]) => {
          updates[`${prefix}/${roomCode}/meta/teams/${teamId}/score`] = teamScore;
        });
        await db.ref().update(updates);
        return NextResponse.json({ success: true, action: 'updateTeamScores', teamScores });
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

      case 'kick': {
        // Simulate host kick (writes to kickedPlayers first, then removes)
        // Player will be redirected to home WITHOUT rejoin option
        if (!playerUid) {
          return NextResponse.json({ error: 'playerUid required' }, { status: 400 });
        }
        // 1. Write to kickedPlayers (same as PlayerManager)
        await db.ref(`${prefix}/${roomCode}/kickedPlayers/${playerUid}`).set({
          at: Date.now(),
          by: 'dev-api'
        });
        // 2. Remove player
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}`).remove();
        await db.ref(`${prefix}/${roomCode}/presence/${playerUid}`).remove();
        return NextResponse.json({ success: true, action: 'kick', playerUid });
      }

      case 'remove': {
        // Simulate network disconnect in lobby (just removes player, no kickedPlayers)
        // Player will see LobbyDisconnectAlert with rejoin option
        if (!playerUid) {
          return NextResponse.json({ error: 'playerUid required' }, { status: 400 });
        }
        await db.ref(`${prefix}/${roomCode}/players/${playerUid}`).remove();
        await db.ref(`${prefix}/${roomCode}/presence/${playerUid}`).remove();
        return NextResponse.json({ success: true, action: 'remove', playerUid });
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

      case 'listTeams': {
        const teamsSnapshot = await db.ref(`${prefix}/${roomCode}/meta/teams`).get();
        const teamsData = teamsSnapshot.exists() ? teamsSnapshot.val() : {};
        return NextResponse.json({
          success: true,
          teams: Object.entries(teamsData).map(([id, t]) => ({
            id,
            name: t.name,
            score: t.score || 0,
            color: t.color
          }))
        });
      }

      case 'addTeamPoints': {
        // Add points to all teams (for testing)
        const { points = 1000 } = body;
        const teamsSnapshot = await db.ref(`${prefix}/${roomCode}/meta/teams`).get();
        if (!teamsSnapshot.exists()) {
          return NextResponse.json({ error: 'No teams found' }, { status: 400 });
        }
        const teamsData = teamsSnapshot.val();
        const updates = {};
        const results = [];
        Object.entries(teamsData).forEach(([teamId, team]) => {
          const currentScore = team.score || 0;
          const newScore = currentScore + points;
          updates[`${prefix}/${roomCode}/meta/teams/${teamId}/score`] = newScore;
          results.push({ id: teamId, name: team.name, oldScore: currentScore, newScore });
        });
        await db.ref().update(updates);
        return NextResponse.json({ success: true, action: 'addTeamPoints', points, teams: results });
      }

      case 'closeRoom': {
        // Ferme une room (met meta.closed = true)
        // Tous les joueurs seront redirigés vers /home
        await db.ref(`${prefix}/${roomCode}/meta/closed`).set(true);
        return NextResponse.json({
          success: true,
          action: 'closeRoom',
          roomCode,
          message: 'Room closed - all players will be redirected'
        });
      }

      case 'simulateBuzzes': {
        // Simule plusieurs buzzes quasi-simultanés pour tester le système de résolution
        // Les buzzes sont écrits avec des timestamps très proches (0-50ms d'écart)
        const snapshot = await playersRef.get();
        if (!snapshot.exists()) {
          return NextResponse.json({ error: 'No players in room' }, { status: 400 });
        }

        const playersData = snapshot.val();
        const fakePlayers = Object.values(playersData).filter(p => p.isFake);

        if (fakePlayers.length < 2) {
          return NextResponse.json({ error: 'Need at least 2 fake players to simulate buzzes' }, { status: 400 });
        }

        // Prendre les 2-3 premiers fake players
        const buzzers = fakePlayers.slice(0, Math.min(3, fakePlayers.length));
        const baseTime = Date.now();

        const pendingBuzzes = {};
        buzzers.forEach((player, index) => {
          // Écart de 10-30ms entre chaque buzz pour simuler quasi-simultanéité
          const offset = index * (10 + Math.random() * 20);
          const localTime = baseTime + offset;
          const adjustedTime = localTime; // En dev, pas d'offset serveur

          pendingBuzzes[player.uid] = {
            uid: player.uid,
            name: player.name,
            localTime,
            adjustedTime,
            receivedAt: Date.now()
          };
        });

        // Écrire tous les buzzes d'un coup
        await db.ref(`${prefix}/${roomCode}/state/pendingBuzzes`).set(pendingBuzzes);

        return NextResponse.json({
          success: true,
          action: 'simulateBuzzes',
          buzzes: Object.values(pendingBuzzes).map(b => ({
            name: b.name,
            adjustedTime: b.adjustedTime
          })),
          message: `Simulated ${buzzers.length} simultaneous buzzes`
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
      actions: ['seed', 'updateScore', 'disconnect', 'reconnect', 'inactive', 'kick', 'remove', 'clear', 'list'],
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
