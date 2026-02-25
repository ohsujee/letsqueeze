/**
 * RevenueCat Webhook Handler
 *
 * Reçoit les événements de paiement de RevenueCat et met à jour
 * le statut d'abonnement dans Firebase de manière sécurisée.
 *
 * Utilise Firebase Admin SDK pour écrire directement, bypassing les règles client.
 *
 * Documentation: https://www.revenuecat.com/docs/webhooks
 */

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Secret partagé pour vérifier l'authenticité des webhooks
// À configurer dans RevenueCat Dashboard > Webhooks > Authorization Header
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// ============================================
// FIREBASE ADMIN INITIALIZATION
// ============================================

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!databaseURL) {
    console.error('[Webhook] Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL');
    return null;
  }

  // Priorité : service account base64 (le plus fiable)
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (serviceAccountBase64) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL,
      });
      console.log('[Webhook] Firebase Admin initialized with base64 service account');
      return admin.apps[0];
    } catch (error) {
      console.error('[Webhook] Failed to initialize Firebase Admin from base64:', error);
      return null;
    }
  }

  console.error('[Webhook] Missing FIREBASE_SERVICE_ACCOUNT_BASE64');
  return null;
}

// ============================================
// MEMBER NUMBER ASSIGNMENT
// ============================================

/**
 * Assigne un numéro de membre permanent à un utilisateur Pro.
 * Le numéro est assigné une seule fois et conservé à vie,
 * même si l'utilisateur se désabonne et se réabonne.
 */
async function assignMemberNumber(userId) {
  const app = getFirebaseAdmin();
  if (!app) return;

  const db = admin.database();
  const memberRef = db.ref(`users/${userId}/memberNumber`);

  // Vérifier si l'utilisateur a déjà un numéro (à conserver pour toujours)
  const snap = await memberRef.get();
  if (snap.exists()) {
    console.log(`[Webhook] User ${userId} already has member number ${snap.val()}`);
    return;
  }

  // Incrémenter le compteur de façon atomique et récupérer le numéro
  const counterRef = db.ref('meta/memberCounter');
  const result = await counterRef.transaction((current) => (current || 0) + 1);

  if (result.committed) {
    const memberNumber = result.snapshot.val();
    await memberRef.set(memberNumber);
    console.log(`[Webhook] Assigned member number ${memberNumber} to user ${userId}`);
  }
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * Types d'événements RevenueCat qui accordent le statut Pro
 */
const PRO_GRANTING_EVENTS = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
];

/**
 * Types d'événements RevenueCat qui révoquent le statut Pro
 */
const PRO_REVOKING_EVENTS = [
  'EXPIRATION',
  'BILLING_ISSUE',
];

// ============================================
// SUBSCRIPTION UPDATE
// ============================================

/**
 * Met à jour le statut d'abonnement dans Firebase via Admin SDK
 */
async function updateFirebaseSubscription(userId, subscriptionData) {
  const app = getFirebaseAdmin();

  if (!app) {
    console.error('[Webhook] Firebase Admin not available');
    return false;
  }

  try {
    const db = admin.database();
    const ref = db.ref(`users/${userId}/subscription`);

    await ref.set(subscriptionData);

    console.log(`[Webhook] Updated subscription for user ${userId}:`, subscriptionData.tier);
    return true;
  } catch (error) {
    console.error('[Webhook] Firebase update error:', error);
    return false;
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

/**
 * POST /api/webhooks/revenuecat
 * Reçoit les webhooks de RevenueCat
 */
export async function POST(request) {
  try {
    // 1. Vérifier l'authentification du webhook
    const authHeader = request.headers.get('Authorization');

    // Secret is REQUIRED in production - reject if not configured
    if (!REVENUECAT_WEBHOOK_SECRET) {
      console.error('[Webhook] REVENUECAT_WEBHOOK_SECRET not configured - rejecting request');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      );
    }

    const expectedAuth = `Bearer ${REVENUECAT_WEBHOOK_SECRET}`;
    if (authHeader !== expectedAuth) {
      console.warn('[Webhook] Invalid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parser le payload
    const payload = await request.json();

    if (!payload.event) {
      return NextResponse.json(
        { error: 'Invalid payload - missing event' },
        { status: 400 }
      );
    }

    const event = payload.event;
    const eventType = event.type;
    const userId = event.app_user_id;
    const entitlement = event.entitlement_identifier || event.entitlement_id;

    console.log(`[Webhook] Received ${eventType} for user ${userId}`);

    // 3. Vérifier qu'on a un user ID
    if (!userId) {
      console.warn('[Webhook] Missing app_user_id');
      return NextResponse.json(
        { error: 'Missing app_user_id' },
        { status: 400 }
      );
    }

    // 4. Traiter l'événement
    if (PRO_GRANTING_EVENTS.includes(eventType)) {
      const expiresAt = event.expiration_at_ms ||
                        event.expiration_at ||
                        (Date.now() + 365 * 24 * 60 * 60 * 1000);

      await updateFirebaseSubscription(userId, {
        tier: 'pro',
        provider: 'revenuecat',
        entitlement: entitlement || 'pro',
        expiresAt: typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime(),
        updatedAt: Date.now(),
        lastEvent: eventType,
      });

      console.log(`[Webhook] Granted Pro to user ${userId} (${eventType})`);

      // Assigner un numéro de membre permanent (seulement au premier achat)
      if (eventType === 'INITIAL_PURCHASE') {
        await assignMemberNumber(userId);
      }
    }
    else if (PRO_REVOKING_EVENTS.includes(eventType)) {
      await updateFirebaseSubscription(userId, {
        tier: 'free',
        provider: null,
        entitlement: null,
        expiresAt: null,
        updatedAt: Date.now(),
        lastEvent: eventType,
      });

      console.log(`[Webhook] Revoked Pro from user ${userId} (${eventType})`);
    }
    else if (eventType === 'CANCELLATION') {
      console.log(`[Webhook] User ${userId} cancelled - Pro active until expiration`);
    }
    else {
      console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // 5. Répondre avec succès
    return NextResponse.json({
      received: true,
      event: eventType,
      user: userId
    });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/revenuecat
 * Endpoint de test
 */
export async function GET() {
  const app = getFirebaseAdmin();

  return NextResponse.json({
    status: 'ok',
    message: 'RevenueCat webhook endpoint is active',
    webhookSecretConfigured: !!REVENUECAT_WEBHOOK_SECRET,
    firebaseAdminReady: !!app,
  });
}
