/**
 * GET /api/daily/semantic-alternative?date=YYYY-MM-DD
 * Returns { alternativeDate } — the date of the word used as alternative
 * (today - 365 days, already revealed)
 */
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

  // Alternative = mot d'il y a 365 jours (déjà révélé)
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() - 365);
  const alternativeDate = d.toISOString().split('T')[0];

  // Vérifier que ce mot existe sur le VPS
  try {
    const res = await fetch(`${apiUrl}/word/${alternativeDate}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!res.ok) {
      // Si erreur VPS, essayer -364
      const d2 = new Date(date + 'T12:00:00');
      d2.setDate(d2.getDate() - 364);
      return Response.json({ alternativeDate: d2.toISOString().split('T')[0] });
    }
    return Response.json({ alternativeDate });
  } catch {
    return Response.json({ alternativeDate });
  }
}
