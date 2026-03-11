import admin from 'firebase-admin';
import { createRequire } from 'module';

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const sa = JSON.parse(Buffer.from(base64, 'base64').toString());

admin.initializeApp({
  credential: admin.credential.cert(sa),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
});

const db = admin.database();
db.ref('debug_logs').orderByKey().limitToLast(100).once('value', snap => {
  const val = snap.val();
  if (!val) {
    console.log('Aucune entrée dans debug_logs');
  } else {
    Object.entries(val).forEach(([k, v]) => {
      const date = new Date(parseInt(k)).toISOString();
      const ua = (v.ua || '').slice(0, 80);
      const msg = (v.msg || '').slice(0, 100);
      console.log(`${date} | ${v.fn} | ${v.code} | ${msg} | ${ua}`);
    });
  }
  process.exit(0);
});
