/**
 * Proxy API pour la connexion au bridge Philips Hue
 * Contourne les problèmes CORS/mixed content du navigateur
 */

export async function POST(request) {
  try {
    const { bridgeIp } = await request.json();

    if (!bridgeIp) {
      return Response.json(
        { error: 'Bridge IP is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`http://${bridgeIp}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ devicetype: 'gigglz#app' }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Hue connect error:', error);
    return Response.json(
      { error: 'Failed to connect to bridge', message: error.message },
      { status: 500 }
    );
  }
}
