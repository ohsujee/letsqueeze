const VPS_URL = 'https://punkrecords.gigglz.fun';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return Response.json({ valid: false, error: 'No word provided' }, { status: 400 });
  }

  try {
    const res = await fetch(`${VPS_URL}/api/dictionary/check?word=${encodeURIComponent(word)}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('Dictionary check error:', err);
    // Fallback: accept the word if VPS is unreachable
    return Response.json({ valid: true, fallback: true });
  }
}
