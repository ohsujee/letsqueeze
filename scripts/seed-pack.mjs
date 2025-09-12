// E:\Quiz-v2\scripts\seed-pack.mjs
// Run me once:  node scripts/seed-pack.mjs
// I bootstrap a full Next.js 14 + Tailwind app, wire Firebase (with your keys),
// write pages (Host/Join/Lobby/Game/End), RTDB rules, manifest + quiz data,
// and synthesize sounds. Works on Windows. Requires Node >= 18 and npm.

// ---------------------------- SETUP & UTILS ---------------------------------
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CWD = process.cwd();
const log = (msg) => console.log(`▸ ${msg}`);
const warn = (msg) => console.warn(`! ${msg}`);
const ok = (msg) => console.log(`✓ ${msg}`);

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeText = (file, text) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text.replace(/\r?\n/g, "\n"), "utf8");
};
const writeJSON = (file, obj) => writeText(file, JSON.stringify(obj, null, 2) + "\n");
const exists = (p) => fs.existsSync(p);
const fileNotExists = (p) => !fs.existsSync(p);

// ---------------------------- USER CONFIG -----------------------------------
// Your Firebase config (as provided)
const FIREBASE = {
  apiKey: "AIzaSyAE0ef6GaqSHHfZieU9-KyhCIv4UwfBV5o",
  authDomain: "letsqueeze.firebaseapp.com",
  databaseURL: "https://letsqueeze-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "letsqueeze",
  storageBucket: "letsqueeze.firebasestorage.app",
  messagingSenderId: "1027748327177",
  appId: "1:1027748327177:web:5b7dbf0df09fc91fcd6dd8",
  measurementId: "G-89JBBC0DYN",
};

// App meta
const APP_NAME = "letsqueeeze"; // folder-safe
const PKG_NAME = "quiz-v2";
const NODE_VERSION = ">=18";

// Dependencies
const DEPENDENCIES = [
  "next@14",
  "react",
  "react-dom",
  "firebase",
  "react-qr-code",
  "classnames"
];
const DEV_DEPENDENCIES = [
  "tailwindcss",
  "postcss",
  "autoprefixer"
];

// ------------------------- WAV GENERATION (4 sounds) ------------------------
function synthSineWavHz(freq = 880, ms = 200, sampleRate = 44100, volume = 0.3) {
  // Simple sine tone with linear attack/release
  const length = Math.floor((ms / 1000) * sampleRate);
  const attack = Math.floor(length * 0.05);
  const release = Math.floor(length * 0.15);
  const data = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env =
      i < attack
        ? i / attack
        : i > length - release
        ? (length - i) / release
        : 1;
    const sample = Math.sin(2 * Math.PI * freq * t) * volume * env;
    data[i] = Math.max(-1, Math.min(1, sample)) * 0x7fff;
  }
  // Build WAV (PCM 16-bit, mono)
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + data.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + data.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20); // format
  buffer.writeUInt16LE(1, 22); // channels
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits
  buffer.write("data", 36);
  buffer.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) {
    buffer.writeInt16LE(data[i], headerSize + i * 2);
  }
  return buffer;
}

function writeSounds() {
  const base = path.join(CWD, "public", "sounds");
  ensureDir(base);
  fs.writeFileSync(path.join(base, "buzz.wav"), synthSineWavHz(880, 250));
  fs.writeFileSync(path.join(base, "correct.wav"), synthSineWavHz(1200, 350));
  fs.writeFileSync(path.join(base, "wrong.wav"), synthSineWavHz(200, 350));
  fs.writeFileSync(path.join(base, "end.wav"), synthSineWavHz(600, 600));
  ok("Synthesized sounds to public/sounds/*");
}

// ------------------------------ DATA PACK -----------------------------------
const MANIFEST = {
  version: "1",
  quizzes: [
    { id: "general", title: "Culture générale", lang: "fr", questionsCount: 20 }
  ]
};

const QUIZ_GENERAL = {
  id: "general",
  title: "Culture générale",
  lang: "fr",
  items: [
    // 3 faciles, 3 moyens, 3 difficiles, 1 extrême… (ici 20 items de démo)
    { id: "q001", question: "Quelle est la capitale de l'Italie ?", answers: ["Milan","Rome","Turin","Naples"], correctIndex: 1, difficulty: "normal", category: "Géo" },
    { id: "q002", question: "Combien font 9 × 7 ?", answers: ["56","63","72","81"], correctIndex: 1, difficulty: "normal", category: "Maths" },
    { id: "q003", question: "Qui a peint la Joconde ?", answers: ["Michel-Ange","Raphaël","Léonard de Vinci","Botticelli"], correctIndex: 2, difficulty: "normal", category: "Art" },
    { id: "q004", question: "Quelle planète est la plus proche du Soleil ?", answers: ["Venus","Mercure","Mars","Terre"], correctIndex: 1, difficulty: "normal", category: "Science" },
    { id: "q005", question: "En quelle année a eu lieu la Révolution française ?", answers: ["1789","1792","1804","1776"], correctIndex: 0, difficulty: "normal", category: "Histoire" },
    { id: "q006", question: "Quel est l’élément chimique 'O' ?", answers: ["Or","Osmium","Oxygène","Ozone"], correctIndex: 2, difficulty: "normal", category: "Science" },
    { id: "q007", question: "Qui a écrit « Les Misérables » ?", answers: ["Balzac","Zola","Hugo","Flaubert"], correctIndex: 2, difficulty: "difficile", category: "Littérature" },
    { id: "q008", question: "Quel océan borde l'ouest des États-Unis ?", answers: ["Atlantique","Arctique","Pacifique","Indien"], correctIndex: 2, difficulty: "normal", category: "Géo" },
    { id: "q009", question: "Quelle est la langue officielle du Brésil ?", answers: ["Espagnol","Portugais","Français","Anglais"], correctIndex: 1, difficulty: "normal", category: "Langue" },
    { id: "q010", question: "Combien y a-t-il de continents ?", answers: ["5","6","7","8"], correctIndex: 2, difficulty: "moyen", category: "Géo" },
    { id: "q011", question: "E=mc² est une formule d’…", answers: ["Einstein","Newton","Bohr","Maxwell"], correctIndex: 0, difficulty: "moyen", category: "Science" },
    { id: "q012", question: "Capitale du Canada ?", answers: ["Toronto","Vancouver","Ottawa","Montréal"], correctIndex: 2, difficulty: "moyen", category: "Géo" },
    { id: "q013", question: "Le mont Everest est dans la chaîne…", answers: ["Andes","Himalaya","Alpes","Rocheuses"], correctIndex: 1, difficulty: "moyen", category: "Géo" },
    { id: "q014", question: "L’ancêtre des ordinateurs modernes s’appelle…", answers: ["Abacus","ENIAC","Pascaline","Colossus"], correctIndex: 1, difficulty: "difficile", category: "Tech" },
    { id: "q015", question: "Qui a composé la 9e symphonie ?", answers: ["Mozart","Beethoven","Bach","Chopin"], correctIndex: 1, difficulty: "difficile", category: "Musique" },
    { id: "q016", question: "Quel métal est liquide à température ambiante ?", answers: ["Fer","Mercure","Aluminium","Sodium"], correctIndex: 1, difficulty: "difficile", category: "Science" },
    { id: "q017", question: "Année de la première Coupe du Monde FIFA ?", answers: ["1930","1934","1928","1950"], correctIndex: 0, difficulty: "difficile", category: "Sport" },
    { id: "q018", question: "Plus grand désert du monde ?", answers: ["Sahara","Arctique","Antarctique","Gobi"], correctIndex: 2, difficulty: "difficile", category: "Géo" },
    { id: "q019", question: "Le symbole 'Na' désigne…", answers: ["Sodium","Nickel","Natrium","Néon"], correctIndex: 0, difficulty: "extrême", category: "Science" },
    { id: "q020", question: "Le plus long fleuve d’Afrique ?", answers: ["Congo","Nil","Niger","Zambèze"], correctIndex: 1, difficulty: "moyen", category: "Géo" }
  ]
};

const SCORING = {
  normal:   { start: 100, floor: 50,  durationMs: 5000 },
  difficile:{ start: 200, floor: 100, durationMs: 5000 },
  lockoutMs: 8000,
  pauseOnBuzz: true,
  autoResetWhenAllLocked: true
};

const UI = {
  style: "cartoonesque",
  colors: { primary: "#ff3b3b", accent: "#ffd400", outline: "#111111" },
  popups: { buzzBannerMs: 2000 },
  confetti: { enabled: true }
};

// ------------------------------ TEMPLATES -----------------------------------
const PKG_JSON = {
  name: PKG_NAME,
  private: true,
  type: "module",
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    "seed:pack": "node scripts/seed-pack.mjs"
  },
  engines: { node: NODE_VERSION },
  dependencies: {},
  devDependencies: {}
};

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: { extend: {} },
  plugins: [],
};
`;

const POSTCSS_CONFIG = `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };`;

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --bg:#fff; --fg:#111; }
html,body { background: var(--bg); color: var(--fg); }
.btn { @apply px-4 py-2 rounded-2xl border-4 border-black font-bold shadow-md active:translate-y-0.5; }
.btn-primary { @apply bg-red-500 text-white; }
.btn-accent { @apply bg-yellow-300; }
.card { @apply rounded-2xl border-4 border-black p-4 shadow-md bg-white; }
.outline-strong { text-shadow: -1px 1px 0 #000, 1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000; }
`;

const APP_LAYOUT = `import "./globals.css";
export const metadata = { title: "Let’sQueeeze", description: "Quiz buzzer temps réel" };
export default function RootLayout({ children }) {
  return (<html lang="fr"><body className="min-h-screen">{children}</body></html>);
}
`;

const APP_HOME = `"use client";
import Link from "next/link";
export default function Home() {
  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-4xl font-black">Let’sQueeeze</h1>
      <div className="grid gap-4">
        <Link className="btn btn-primary text-center" href="/host">Je suis l’animateur</Link>
        <Link className="btn btn-accent text-center" href="/join">Je suis un joueur</Link>
      </div>
      <p className="text-sm opacity-70">Mobile-first • Jusqu’à 50 joueurs • Firebase RTDB</p>
    </main>
  );
}
`;

const LIB_FIREBASE = `import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, update, runTransaction, serverTimestamp } from "firebase/database";

const firebaseConfig = ${JSON.stringify(FIREBASE, null, 2)};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
let analytics = null;
if (typeof window !== "undefined") { try { if (await isSupported()) analytics = getAnalytics(app); } catch {} }
export const auth = getAuth(app);
export const db = getDatabase(app);
export { ref, set, get, onValue, update, runTransaction, serverTimestamp, signInAnonymously, onAuthStateChanged };
`;

const UTIL_MISC = `export function genCode(len=6){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,I,0,1
  let s=""; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
`;

const COMP_QR = `import QRCode from "react-qr-code";
export default function Qr({ value, size=192 }) {
  return <div className="p-3 bg-white border-4 border-black rounded-2xl inline-block"><QRCode value={value} size={size} /></div>;
}
`;

const COMP_BUZZER = `"use client";
export default function Buzzer({ onBuzz, disabled }) {
  return (
    <button disabled={disabled} onClick={onBuzz}
      className={"btn btn-primary w-full h-32 text-3xl " + (disabled?"opacity-50":"")}>
      BUZZ !
    </button>
  );
}
`;

const APP_HOST = `"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db, ref, set, update, onValue, signInAnonymously, runTransaction } from "@/lib/firebase";
import Link from "next/link";
import Qr from "@/components/Qr";
import { genCode } from "@/lib/utils";

export default function HostPage(){
  const [ready,setReady]=useState(false);
  const [user,setUser]=useState(null);
  const [room,setRoom]=useState(null);
  const [code,setCode]=useState("");
  const joinUrl = useMemo(()=> typeof window!=="undefined" ? window.location.origin + "/join?code="+code : "", [code]);

  useEffect(()=>{
    signInAnonymously(auth).then(()=>setReady(true));
    const unsub = auth.onAuthStateChanged(u=>setUser(u));
    return ()=>unsub();
  },[]);

  async function createRoom(){
    const c = genCode();
    const now = Date.now();
    await set(ref(db, "rooms/"+c+"/meta"), {
      code: c, createdAt: now, hostUid: auth.currentUser.uid, expiresAt: now + 12*60*60*1000,
      mode: "individuel", teamCount: 0, quizId: "general"
    });
    await set(ref(db, "rooms/"+c+"/state"), {
      phase: "lobby", currentIndex: 0, revealed: false, lockUid: null, buzzBanner: "", lastRevealAt: 0
    });
    await set(ref(db, "rooms/"+c+"/__health__"), { aliveAt: now });
    setCode(c);
    setRoom(c);
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Animateur — Créer une room</h1>
      {!user && <p>Connexion anonyme…</p>}
      {user && !room && <button className="btn btn-primary" onClick={createRoom}>Créer une room</button>}
      {room && (
        <div className="space-y-3">
          <p className="card">Code room : <span className="font-black text-2xl">{code}</span></p>
          <div className="flex items-center gap-3 flex-wrap">
            {joinUrl && <Qr value={joinUrl} />}
            <div className="space-y-2">
              <p><b>Inviter :</b> {joinUrl}</p>
              <div className="flex gap-2">
                <Link className="btn btn-accent" href={"/room/"+code}>Aller au lobby</Link>
                <Link className="btn btn-primary" href={"/game/"+code+"/host"}>Écran Animateur</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
`;

const APP_JOIN = `"use client";
import { useEffect, useState } from "react";
import { auth, db, ref, set, onValue, signInAnonymously } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage(){
  const router = useRouter();
  const params = useSearchParams();
  const [pseudo,setPseudo]=useState("");
  const [code,setCode]=useState(params.get("code")||"");
  const [user,setUser]=useState(null);
  useEffect(()=>{
    signInAnonymously(auth).then(()=>{});
    return auth.onAuthStateChanged(u=>setUser(u));
  },[]);
  async function join(){
    if(!code||!pseudo) return;
    const uid = auth.currentUser.uid;
    await set(ref(db, \`rooms/\${code}/players/\${uid}\`), {
      uid, name: pseudo, score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now()
    });
    router.push("/room/"+code);
  }
  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Rejoindre une room</h1>
      <input className="card w-full" placeholder="Code (6 caractères)" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/>
      <input className="card w-full" placeholder="Ton pseudo" value={pseudo} onChange={e=>setPseudo(e.target.value)}/>
      <button className="btn btn-primary w-full" onClick={join}>Rejoindre</button>
    </main>
  );
}
`;

const APP_ROOM = `"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, update, signInAnonymously } from "@/lib/firebase";

export default function LobbyPage(){
  const { code } = useParams();
  const router = useRouter();
  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);
  const [quizList,setQuizList]=useState([]);
  const [user,setUser]=useState(null);

  useEffect(()=>{
    signInAnonymously(auth);
    const unsub = auth.onAuthStateChanged(u=>setUser(u));
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const pRef = ref(db, \`rooms/\${code}/players\`);
    const mRef = ref(db, \`rooms/\${code}/meta\`);
    const sRef = ref(db, \`rooms/\${code}/state\`);
    const u1 = onValue(pRef, snap=>{
      const val = snap.val()||{};
      setPlayers(Object.values(val).sort((a,b)=>a.joinedAt-b.joinedAt));
    });
    const u2 = onValue(mRef, snap=> setMeta(snap.val()));
    const u3 = onValue(sRef, snap=>{
      const s = snap.val();
      if (s?.phase === "playing") router.push(\`/game/\${code}/play\`);
    });
    fetch("/data/manifest.json").then(r=>r.json()).then(m=>setQuizList(m.quizzes||[]));
    return ()=>{ u1(); u2(); u3(); };
  },[code, router]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;

  async function setMode(mode){
    if(!isHost) return;
    await update(ref(db, \`rooms/\${code}/meta\`), { mode, teamCount: mode==="équipes"?2:0 });
  }
  async function setQuiz(id){
    if(!isHost) return;
    await update(ref(db, \`rooms/\${code}/meta\`), { quizId: id });
  }
  async function start(){
    if(!isHost) return;
    await update(ref(db, \`rooms/\${code}/state\`), { phase: "playing", currentIndex: 0, revealed: false, lockUid: null, buzzBanner: "" });
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Lobby — Room {code}</h1>
      <div className="card">
        <div className="flex justify-between items-center">
          <div><b>Mode :</b> {meta?.mode || "individuel"}</div>
          {isHost && (
            <div className="flex gap-2">
              <button className="btn" onClick={()=>setMode("individuel")}>Individuel</button>
              <button className="btn" onClick={()=>setMode("équipes")}>Équipes</button>
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <div><b>Quiz :</b> {meta?.quizId}</div>
          {isHost && (
            <select className="card" value={meta?.quizId||"general"} onChange={e=>setQuiz(e.target.value)}>
              {quizList.map(q=> <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="card">
        <b>Joueurs ({players.length})</b>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {players.map(p=> <li key={p.uid} className="card">{p.name}</li>)}
        </ul>
      </div>
      {isHost && <button className="btn btn-primary w-full" onClick={start}>Démarrer la partie</button>}
    </main>
  );
}
`;

const APP_GAME_HOST = `"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db, ref, onValue, update, runTransaction } from "@/lib/firebase";

function useQuiz(quizId){
  const [quiz,setQuiz]=useState(null);
  useEffect(()=>{ fetch(\`/data/\${quizId}.json\`).then(r=>r.json()).then(setQuiz); },[quizId]);
  return quiz;
}

export default function HostGame(){
  const { code } = useParams();
  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [players,setPlayers]=useState([]);
  const quiz = useQuiz(meta?.quizId || "general");

  useEffect(()=>{
    const u1 = onValue(ref(db,\`rooms/\${code}/meta\`), s=>setMeta(s.val()));
    const u2 = onValue(ref(db,\`rooms/\${code}/state\`), s=>setState(s.val()));
    const u3 = onValue(ref(db,\`rooms/\${code}/players\`), s=>{
      const v = s.val()||{}; setPlayers(Object.values(v));
    });
    return ()=>{u1();u2();u3();};
  },[code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const q = quiz?.items?.[state?.currentIndex||0];

  async function revealToggle(){
    if(!isHost || !q) return;
    const now = Date.now();
    await update(ref(db,\`rooms/\${code}/state\`), { revealed: !state?.revealed, lastRevealAt: now, lockUid: null, buzzBanner: "" });
  }
  async function resetBuzzers(){
    if(!isHost) return;
    await update(ref(db,\`rooms/\${code}/state\`), { lockUid: null, buzzBanner: "" });
  }
  async function validate(){
    if(!isHost || !q || !state?.lockUid) return;
    const lockUid = state.lockUid;
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const conf = await (await fetch("/config/scoring.json")).json();
    const start = conf[diff].start; const floor = conf[diff].floor; const dur = conf[diff].durationMs;
    const elapsed = Math.max(0, Date.now() - (state.lastRevealAt||Date.now()));
    const ratio = Math.max(0, 1 - (elapsed/dur));
    const points = Math.max(floor, Math.round(start * ratio));
    // Add points atomically
    await runTransaction(ref(db,\`rooms/\${code}/players/\${lockUid}/score\`),(cur)=> (cur||0)+points);
    // Next question
    await update(ref(db,\`rooms/\${code}/state\`), { currentIndex: (state.currentIndex||0)+1, revealed:false, lockUid:null, buzzBanner:"" });
  }
  async function wrong(){
    if(!isHost || !state?.lockUid) return;
    const conf = await (await fetch("/config/scoring.json")).json();
    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;
    await update(ref(db,\`rooms/\${code}/players/\${uid}\`), { blockedUntil: Date.now()+ms });
    await update(ref(db,\`rooms/\${code}/state\`), { lockUid:null, buzzBanner:"" });
  }
  async function end(){
    if(!isHost) return;
    await update(ref(db,\`rooms/\${code}/state\`), { phase:"ended" });
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Écran Animateur — {code}</h1>
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={revealToggle}>{state?.revealed?"Masquer":"Révéler"} la question</button>
          <button className="btn" onClick={resetBuzzers}>Reset buzzers</button>
          <button className="btn" onClick={wrong}>✘ Mauvaise</button>
          <button className="btn btn-accent" onClick={validate}>✔ Valider</button>
          <button className="btn" onClick={end}>Terminer</button>
        </div>
      </div>
      {q ? (
        <div className="card">
          <div className="text-xl font-black mb-2">Q{(state?.currentIndex||0)+1} — {q.category? \`[\${q.category}] \`:""}{q.question}</div>
          <ol className={"grid gap-2 " + (state?.revealed?"":"opacity-40")}>
            {q.answers.map((a,i)=>(<li key={i} className="card">{String.fromCharCode(65+i)}. {a}</li>))}
          </ol>
          <div className="mt-3">
            <b>Lock:</b> {state?.lockUid ? (players.find(p=>p.uid===state.lockUid)?.name || state.lockUid) : "—"}
            {state?.buzzBanner && <div className="mt-2 card bg-yellow-200 border-black">{state.buzzBanner}</div>}
          </div>
        </div>
      ) : <div className="card">Plus de questions. Terminez la partie.</div>}
      <div className="card">
        <b>Podium</b>
        <ul className="grid grid-cols-2 gap-2 mt-2">
          {players.sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,3).map((p,i)=>(<li key={p.uid} className="card">{i+1}. {p.name} — <b>{p.score||0}</b></li>))}
        </ul>
      </div>
    </main>
  );
}
`;

const APP_GAME_PLAY = `"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, runTransaction, update, signInAnonymously } from "@/lib/firebase";
import Buzzer from "@/components/Buzzer";

export default function PlayerGame(){
  const { code } = useParams();
  const router = useRouter();
  const [user,setUser]=useState(null);
  const [state,setState]=useState(null);
  const [meta,setMeta]=useState(null);
  const [players,setPlayers]=useState([]);
  const [me,setMe]=useState(null);

  useEffect(()=>{
    signInAnonymously(auth).then(()=>{});
    return auth.onAuthStateChanged(u=>setUser(u));
  },[]);

  useEffect(()=>{
    const u1 = onValue(ref(db,\`rooms/\${code}/state\`), s=>{
      const v=s.val();
      setState(v);
      if(v?.phase==="ended") router.push("/end/"+code);
    });
    const u2 = onValue(ref(db,\`rooms/\${code}/meta\`), s=>setMeta(s.val()));
    const u3 = onValue(ref(db,\`rooms/\${code}/players\`), s=>{
      const v = s.val()||{};
      const arr = Object.values(v);
      setPlayers(arr);
      setMe(arr.find(p=>p.uid===auth.currentUser?.uid)||null);
    });
    return ()=>{u1();u2();u3();};
  },[code, router]);

  const revealed = !!state?.revealed;
  const locked = !!state?.lockUid;
  const blocked = (me?.blockedUntil||0) > Date.now();

  async function buzz(){
    if(!revealed || blocked) return;
    // claim lock if none
    const lockRef = ref(db, \`rooms/\${code}/state/lockUid\`);
    await runTransaction(lockRef, cur => cur ? cur : auth.currentUser.uid );
    // write banner (best-effort)
    if(!state?.lockUid){
      await update(ref(db,\`rooms/\${code}/state\`), { buzzBanner: \`🔔 \${me?.name||"Un joueur"} a buzzé !\` });
      // auto-clear banner later (client-side UX)
      setTimeout(()=> update(ref(db,\`rooms/\${code}/state\`), { buzzBanner: "" }), 2000);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-black">Player — Room {code}</h1>
      <div className="card"><b>Score :</b> {me?.score||0}</div>
      <div className={"card " + (revealed?"":"opacity-40")}>
        <div className="mb-2"><b>{revealed?"Question en cours":"En attente de révélation…"}</b></div>
        <div className="text-sm opacity-70">Top 3</div>
        <ul className="grid grid-cols-2 gap-2 mt-1">
          {players.sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,3).map((p,i)=>(<li key={p.uid} className="card">{i+1}. {p.name} — <b>{p.score||0}</b></li>))}
        </ul>
      </div>
      <Buzzer onBuzz={buzz} disabled={!revealed || locked || blocked}/>
      {state?.buzzBanner && <div className="card bg-yellow-200 border-black">{state.buzzBanner}</div>}
      {blocked && <div className="card bg-gray-200">⏳ Pénalité 8s après erreur/buzz trop tôt</div>}
    </main>
  );
}
`;

const APP_END = `"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db, ref, onValue } from "@/lib/firebase";

export default function EndPage(){
  const { code } = useParams();
  const [players,setPlayers]=useState([]);
  useEffect(()=>{
    const u = onValue(ref(db,\`rooms/\${code}/players\`), s=>{
      const v=s.val()||{};
      setPlayers(Object.values(v).sort((a,b)=> (b.score||0)-(a.score||0)));
    });
    return ()=>u();
  },[code]);
  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Podium — {code}</h1>
      <ol className="space-y-2">
        {players.map((p,i)=>(
          <li key={p.uid} className="card flex justify-between">
            <span>{i+1}. {p.name}</span>
            <b>{p.score||0} pts</b>
          </li>
        ))}
      </ol>
    </main>
  );
}
`;

const FIREBASE_RULES = `{
  "rules": {
    ".read": "auth != null",
    "rooms": {
      "$code": {
        ".read": "auth != null",
        "meta": {
          ".write": "auth != null && auth.uid == root.child('rooms/'+$code+'/meta/hostUid').val()"
        },
        "state": {
          ".write": "auth != null && auth.uid == root.child('rooms/'+$code+'/meta/hostUid').val()"
        },
        "players": {
          "$uid": {
            ".write": "auth != null && auth.uid == $uid"
          },
          ".read": "auth != null"
        },
        "history": {
          ".write": "auth != null && auth.uid == root.child('rooms/'+$code+'/meta/hostUid').val()"
        },
        "__health__": {
          ".write": "auth != null && auth.uid == root.child('rooms/'+$code+'/meta/hostUid').val()"
        }
      }
    }
  }
}
`;

// ------------------------------- WRITE FILES --------------------------------
function writeScaffold() {
  // package.json
  const pkgFile = path.join(CWD, "package.json");
  if (fileNotExists(pkgFile)) {
    writeText(pkgFile, JSON.stringify(PKG_JSON, null, 2));
    ok("Created package.json");
  } else {
    // merge scripts minimally
    const cur = JSON.parse(fs.readFileSync(pkgFile,"utf8"));
    cur.scripts = { ...(cur.scripts||{}), dev:"next dev", build:"next build", start:"next start", "seed:pack":"node scripts/seed-pack.mjs" };
    cur.engines = { node: NODE_VERSION };
    writeText(pkgFile, JSON.stringify(cur, null, 2));
    ok("Updated package.json");
  }

  // next & tailwind configs
  writeText(path.join(CWD,"next.config.mjs"), NEXT_CONFIG);
  writeText(path.join(CWD,"tailwind.config.js"), TAILWIND_CONFIG);
  writeText(path.join(CWD,"postcss.config.js"), POSTCSS_CONFIG);

  // app structure
  writeText(path.join(CWD,"app","layout.js"), APP_LAYOUT);
  writeText(path.join(CWD,"app","page.js"), APP_HOME);
  writeText(path.join(CWD,"app","host","page.jsx"), APP_HOST);
  writeText(path.join(CWD,"app","join","page.jsx"), APP_JOIN);
  writeText(path.join(CWD,"app","room","[code]","page.jsx"), APP_ROOM);
  writeText(path.join(CWD,"app","game","[code]","host","page.jsx"), APP_GAME_HOST);
  writeText(path.join(CWD,"app","game","[code]","play","page.jsx"), APP_GAME_PLAY);
  writeText(path.join(CWD,"app","end","[code]","page.jsx"), APP_END);

  // lib & components
  writeText(path.join(CWD,"lib","firebase.js"), LIB_FIREBASE);
  writeText(path.join(CWD,"lib","utils.js"), UTIL_MISC);
  writeText(path.join(CWD,"components","Qr.jsx"), COMP_QR);
  writeText(path.join(CWD,"components","Buzzer.jsx"), COMP_BUZZER);

  // styles
  writeText(path.join(CWD,"app","globals.css"), GLOBALS_CSS);

  // public data/config
  writeJSON(path.join(CWD,"public","data","manifest.json"), MANIFEST);
  writeJSON(path.join(CWD,"public","data","general.json"), QUIZ_GENERAL);
  writeJSON(path.join(CWD,"public","config","scoring.json"), SCORING);
  writeJSON(path.join(CWD,"public","config","ui.json"), UI);

  // firebase rules
  writeText(path.join(CWD,"firebase.rules.json"), FIREBASE_RULES);

  // sounds
  writeSounds();

  // gitignore (optional)
  if (fileNotExists(path.join(CWD,".gitignore"))) {
    writeText(path.join(CWD,".gitignore"), `/.next\n/node_modules\n.vercel\n.DS_Store\n`);
  }
}

// ------------------------------- INSTALL DEPS -------------------------------
function installDeps() {
  const hasNodeModules = exists(path.join(CWD,"node_modules"));
  const pkg = JSON.parse(fs.readFileSync(path.join(CWD,"package.json"),"utf8"));
  const need = [];
  for (const d of DEPENDENCIES) {
    const name = d.split("@")[0];
    if (!pkg.dependencies?.[name]) need.push(d);
  }
  const needDev = [];
  for (const d of DEV_DEPENDENCIES) {
    if (!pkg.devDependencies?.[d]) needDev.push(d);
  }

  if (!exists(path.join(CWD,"package-lock.json")) && fileNotExists(path.join(CWD,"pnpm-lock.yaml")) && fileNotExists(path.join(CWD,"yarn.lock"))) {
    // ensure package.json valid (npm init -y was implicit via pkg write)
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  if (need.length) {
    log("Installing dependencies: " + need.join(" "));
    const r = spawnSync(npmCmd, ["install", ...need], { stdio: "inherit", cwd: CWD });
    if (r.status !== 0) throw new Error("npm install failed");
  }
  if (needDev.length) {
    log("Installing devDependencies: " + needDev.join(" "));
    const r2 = spawnSync(npmCmd, ["install","-D", ...needDev], { stdio: "inherit", cwd: CWD });
    if (r2.status !== 0) throw new Error("npm install -D failed");
  }
}

// ------------------------------- MAIN ---------------------------------------
async function main() {
  console.log("");
  console.log("Let’sQueeeze — one-shot bootstrap");
  console.log("---------------------------------");

  writeScaffold();
  ok("Project files written.");

  try {
    installDeps();
    ok("Dependencies installed.");
  } catch (e) {
    warn("Dependency install failed. You can run them manually:");
    console.log("  npm install " + DEPENDENCIES.join(" "));
    console.log("  npm install -D " + DEV_DEPENDENCIES.join(" "));
  }

  console.log("");
  ok("Done! Next steps:");
  console.log("  1) npm run dev");
  console.log("  2) Ouvre http://localhost:3000");
  console.log("  3) Clique « Animateur » → Créer une room → Partage le QR / code");
  console.log("");
  console.log("Déploiement : push sur GitHub puis Vercel (build Next standard).");
  console.log("");
}

main().catch(err=>{ console.error(err); process.exit(1); });
