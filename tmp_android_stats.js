
export async function getAndroidStats() {
  try {
    const { google } = await import('googleapis');

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountBase64) return null;

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/playdeveloperreporting'],
    });

    const authClient = await auth.getClient();

    // 7 derniers jours (format YYYYMMDD)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - 2); // Play a un délai de ~2 jours
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    const fmt = (d) => ({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });

    const packageName = 'com.gigglz.app';
    const url = `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${packageName}/storePerformanceCountryReport:query`;

    const token = await authClient.getAccessToken();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeline: {
          aggregationPeriod: 'DAILY',
          startDate: fmt(startDate),
          endDate: fmt(endDate),
        },
        metrics: ['storeListingVisitors', 'installers'],
        dimensionFilters: [],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[getAndroidStats] API error:', response.status, err);
      return null;
    }

    const data = await response.json();
    const rows = data.rows || [];

    let total7d = 0;
    let latestDay = 0;
    let latestDate = null;

    for (const row of rows) {
      const installs = row.metrics?.find(m => m.metric === 'installers')?.decimalValue || 0;
      const dateVal = row.startDate;
      const dateStr = `${dateVal.year}-${String(dateVal.month).padStart(2, '0')}-${String(dateVal.day).padStart(2, '0')}`;
      total7d += Number(installs);
      if (!latestDate || dateStr > latestDate) {
        latestDate = dateStr;
        latestDay = Number(installs);
      }
    }

    return { last7d: total7d, latestDate, latestDay };
  } catch (e) {
    console.error('[getAndroidStats]', e.message);
    return null;
  }
}
