import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';

const KEY_ID = process.env.APP_STORE_KEY_ID;
const ISSUER_ID = process.env.APP_STORE_ISSUER_ID;
const P8_PATH = process.env.APP_STORE_P8_PATH;
const VENDOR_NUMBER = process.env.APP_STORE_VENDOR_NUMBER;

async function generateToken() {
  const privateKey = readFileSync(P8_PATH, 'utf8');
  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(ISSUER_ID)
    .setIssuedAt()
    .setExpirationTime('20m')
    .setAudience('appstoreconnect-v1')
    .sign(key);
}

async function fetchDayReport(token, date) {
  const dateStr = date.toISOString().split('T')[0];
  const url = new URL('https://api.appstoreconnect.apple.com/v1/salesReports');
  url.searchParams.set('filter[frequency]', 'DAILY');
  url.searchParams.set('filter[reportType]', 'SALES');
  url.searchParams.set('filter[reportSubType]', 'SUMMARY');
  url.searchParams.set('filter[vendorNumber]', VENDOR_NUMBER);
  url.searchParams.set('filter[reportDate]', dateStr);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/a-gzip',
    },
  });

  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  const decompressed = gunzipSync(Buffer.from(buffer)).toString('utf8');

  const lines = decompressed.split('\n').filter(l => l.trim());
  let units = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const productType = cols[6];
    // Type 1 = free download, 7 = paid download
    if (productType === '1' || productType === '7') {
      units += parseInt(cols[7]) || 0;
    }
  }
  return { date: dateStr, units };
}

export async function GET() {
  try {
    if (!KEY_ID || !ISSUER_ID || !P8_PATH || !VENDOR_NUMBER) {
      return NextResponse.json({ error: 'App Store credentials not configured' }, { status: 503 });
    }

    const token = await generateToken();

    // Apple a un délai de 2 jours — on fetch les 7 derniers jours disponibles
    const results = [];
    for (let i = 2; i <= 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const result = await fetchDayReport(token, date);
      if (result) results.push(result);
    }

    const total7d = results.reduce((sum, r) => sum + r.units, 0);
    const latest = results[0] || null;

    return NextResponse.json({
      ios: {
        last7d: total7d,
        latestDate: latest?.date,
        latestDay: latest?.units ?? 0,
        dailyBreakdown: results,
      },
    });
  } catch (error) {
    console.error('[store-stats]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
