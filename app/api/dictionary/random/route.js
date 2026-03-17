const VPS_URL = 'https://punkrecords.gigglz.fun';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get('exclude') || '';

  try {
    const url = exclude
      ? `${VPS_URL}/api/dictionary/random?exclude=${encodeURIComponent(exclude)}`
      : `${VPS_URL}/api/dictionary/random`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('Dictionary random error:', err);
    return Response.json({ error: 'Service indisponible' }, { status: 503 });
  }
}
