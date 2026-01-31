/**
 * Spotify OAuth Callback Handler
 * Reçoit le code d'autorisation et redirige vers le frontend
 */

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // URL de base pour les redirections
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.gigglz.fun';

  // Si erreur (user a refusé ou autre)
  if (error) {
    console.error('Spotify OAuth error:', error);
    return NextResponse.redirect(
      `${baseUrl}/blindtest?spotify_error=${encodeURIComponent(error)}`
    );
  }

  // Si pas de code, erreur
  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/blindtest?spotify_error=no_code`
    );
  }

  // Rediriger vers le frontend avec le code
  // Le frontend va échanger le code contre les tokens (PKCE flow côté client)
  const redirectUrl = new URL(`${baseUrl}/blindtest/spotify-callback`);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}
