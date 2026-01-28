/**
 * Proxy API pour la découverte des bridges Philips Hue
 * Contourne les problèmes CORS du navigateur
 */

export async function GET() {
  try {
    const response = await fetch('https://discovery.meethue.com/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Hue discovery service unavailable' },
        { status: response.status }
      );
    }

    const bridges = await response.json();
    return Response.json(bridges);
  } catch (error) {
    console.error('Hue discovery error:', error);
    return Response.json(
      { error: 'Failed to discover bridges', message: error.message },
      { status: 500 }
    );
  }
}
