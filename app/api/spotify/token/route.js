/**
 * Spotify Token API - Secure httpOnly cookie management
 *
 * POST: Exchange authorization code for tokens (stores in httpOnly cookies)
 * GET: Get current access token (refreshes if needed)
 * DELETE: Clear tokens (logout)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Cookie options for security
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

// Access token expires in 1 hour, but we set cookie to 1 day (refresh handles expiry)
const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * POST - Exchange authorization code for tokens
 * Body: { code, codeVerifier }
 */
export async function POST(request) {
  try {
    const { code, codeVerifier } = await request.json();

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code or codeVerifier' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Spotify not configured' },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Spotify Token API] Exchange failed:', error);
      return NextResponse.json(
        { error: error.error_description || 'Token exchange failed' },
        { status: 400 }
      );
    }

    const tokens = await response.json();
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    // Store tokens in httpOnly cookies
    const cookieStore = await cookies();

    cookieStore.set('spotify_access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    cookieStore.set('spotify_token_expires_at', expiresAt.toString(), {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    if (tokens.refresh_token) {
      cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }

    console.log('[Spotify Token API] Tokens stored in cookies');

    return NextResponse.json({
      success: true,
      expiresIn: tokens.expires_in
    });

  } catch (error) {
    console.error('[Spotify Token API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get current access token (refreshes if expired)
 * Returns: { accessToken, connected }
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    let accessToken = cookieStore.get('spotify_access_token')?.value;
    const expiresAt = parseInt(cookieStore.get('spotify_token_expires_at')?.value || '0');
    const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

    // Not connected
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ connected: false });
    }

    // Token expired or expiring soon (5 min buffer)
    const needsRefresh = !accessToken || Date.now() > expiresAt - 5 * 60 * 1000;

    if (needsRefresh && refreshToken) {
      console.log('[Spotify Token API] Refreshing token...');

      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        console.error('[Spotify Token API] Refresh failed, clearing tokens');
        // Clear invalid tokens
        cookieStore.delete('spotify_access_token');
        cookieStore.delete('spotify_refresh_token');
        cookieStore.delete('spotify_token_expires_at');
        return NextResponse.json({ connected: false, error: 'Token refresh failed' });
      }

      const tokens = await response.json();
      const newExpiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update cookies
      cookieStore.set('spotify_access_token', tokens.access_token, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      cookieStore.set('spotify_token_expires_at', newExpiresAt.toString(), {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      // Update refresh token if provided
      if (tokens.refresh_token) {
        cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
          ...COOKIE_OPTIONS,
          maxAge: REFRESH_TOKEN_MAX_AGE,
        });
      }

      accessToken = tokens.access_token;
      console.log('[Spotify Token API] Token refreshed successfully');
    }

    return NextResponse.json({
      connected: true,
      accessToken: accessToken
    });

  } catch (error) {
    console.error('[Spotify Token API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', connected: false },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all Spotify tokens (logout)
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    cookieStore.delete('spotify_access_token');
    cookieStore.delete('spotify_refresh_token');
    cookieStore.delete('spotify_token_expires_at');

    console.log('[Spotify Token API] Tokens cleared');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Spotify Token API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
