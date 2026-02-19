/**
 * Dev Auth API - Custom Token Generator
 *
 * SECURITY: Only works in development (localhost)
 * Generates Firebase custom tokens for testing with specific UIDs
 *
 * Usage: GET /api/dev/auth?uid=USER_UID
 */

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

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
    console.error('[DevAuth] Missing Firebase configuration');
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
      console.log('[DevAuth] Firebase Admin initialized');
      return admin.apps[0];
    } catch (error) {
      console.error('[DevAuth] Failed to initialize Firebase Admin:', error);
      return null;
    }
  }

  return null;
}

// ============================================
// SECURITY CHECK
// ============================================

function isDevelopment(request) {
  // Dev server only runs with NODE_ENV=development — that's sufficient
  return process.env.NODE_ENV === 'development';
}

// ============================================
// API HANDLER
// ============================================

/**
 * GET /api/dev/auth?uid=USER_UID
 * Returns a custom Firebase token for the specified UID
 */
export async function GET(request) {
  // Security: Only allow in development
  if (!isDevelopment(request)) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  // Get UID from query params
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json(
      { error: 'Missing uid parameter' },
      { status: 400 }
    );
  }

  // Initialize Firebase Admin
  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars.' },
      { status: 500 }
    );
  }

  try {
    // Generate custom token for the specified UID
    const customToken = await admin.auth().createCustomToken(uid);

    console.log(`[DevAuth] Generated token for UID: ${uid}`);

    return NextResponse.json({
      success: true,
      token: customToken,
      uid: uid,
    });
  } catch (error) {
    console.error('[DevAuth] Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    );
  }
}
