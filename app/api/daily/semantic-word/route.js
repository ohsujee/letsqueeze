export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Missing or invalid date' }, { status: 400 });
  }

  const apiUrl = process.env.SEMANTIC_API_URL;
  const apiKey = process.env.SEMANTIC_API_KEY;

  if (!apiUrl || !apiKey) {
    return Response.json({ error: 'API not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(`${apiUrl}/word/${date}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (res.status === 403) {
      return Response.json({ error: 'Only past dates allowed' }, { status: 403 });
    }
    if (!res.ok) {
      return Response.json({ error: 'VPS error' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ word: data.word });
  } catch {
    return Response.json({ error: 'API unavailable' }, { status: 503 });
  }
}
