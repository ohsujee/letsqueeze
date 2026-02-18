export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const word = searchParams.get('word');

  if (!date || !word) {
    return Response.json({ error: 'Missing params' }, { status: 400 });
  }

  const apiUrl = process.env.SEMANTIC_API_URL;
  const apiKey = process.env.SEMANTIC_API_KEY;

  if (!apiUrl || !apiKey) {
    return Response.json({ error: 'API non configurée' }, { status: 503 });
  }

  try {
    const res = await fetch(`${apiUrl}/score/${date}/${encodeURIComponent(word)}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (res.status === 404) {
      return Response.json({ error: 'Mot non reconnu' }, { status: 404 });
    }
    if (!res.ok) {
      return Response.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'API indisponible' }, { status: 503 });
  }
}
