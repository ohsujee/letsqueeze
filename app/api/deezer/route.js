/**
 * Deezer API Proxy
 *
 * Proxies requests to Deezer API to avoid CORS issues
 * The Deezer API doesn't support CORS, so we need server-side requests
 */

import { NextResponse } from 'next/server';

const DEEZER_API_BASE = 'https://api.deezer.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  try {
    // Build the full Deezer URL
    const deezerUrl = `${DEEZER_API_BASE}${endpoint}`;

    const response = await fetch(deezerUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Deezer API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for Deezer API errors
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'Deezer API error' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Deezer proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Deezer API' },
      { status: 500 }
    );
  }
}
