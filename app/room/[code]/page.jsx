"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Qr from "@/components/Qr";
import {
  auth, db, ref, onValue, update, set, remove, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";

const TEAM_PRESETS = [
  { id: "red",   name: "Rouges",  color: "#ef4444" },
  { id: "blue",  name: "Bleus",   color: "#3b82f6" },
  { id: "green", name: "Verts",   color: "#22c55e" },
  { id: "yellow",name: "Jaunes",  color: "#eab308" },
];

export default function RoomLobby() {
  const { code } = useParams();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [showInvite, setShowInvite] = useState(true); // host peut réafficher QR

  // Auth
  useEffect(() => {
    signInAnonymously(auth).catch(()=>{});
    const unsub = onAuthStateChanged(auth, (u) => setMe(u));
    return () => unsub();
  }, []);

  // Data
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms/${code}/meta`), s => setMeta(s.val() || {}));
    const u2 = onValue(ref(db, `rooms/${code}/players`), s => {
      const v = s.val() || {};
      setPlayers(Object.values(v));
    });
    const u3 = onValue(ref(db, `rooms/${code}/state`), s => setState(s.val() || {}));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Redirection uniquement quand "playing" (PLUS de redirection si "ended")
  useEffect(() => {
    if (state?.phase === "playing") {
      if (meta?.hostUid === auth.currentUser?.uid) router.replace(`/game/${code}/host`);
      else router.replace(`/game/${code}/play`);
    }
  }, [state?.phase, meta?.hostUid, router, code]);

  // Manifest quizz
  useEffect(() => {
    fetch("/data/manifest.json")
      .then(r => r.json())
      .then(j => setManifest(j?.quizzes || []))
      .catch(() => setManifest([]));
  }, []);

  const isHost = meta?.hostUid === me?.uid;
  const roomUrl = typeof window !== "undefined" ? `${location.origin}/join?code=${code}` : "";

  const modeTeams = meta?.mode === "équipes";
  const teams = meta?.teams || {};
  const teamsList = useMemo(() => Object.keys(teams).map((k) => ({ id: k, ...teams[k] })), [teams]);

  // --- Actions Host ---
  function toggleInvite() { setShowInvite(v => !v); }
  async function shareRoom() {
    try {
      if (navigator.share) await navigator.share({ title: "Rejoins la partie", text: `Code ${code}`, url: roomUrl });
      else { await navigator.clipboard.writeText(roomUrl); alert("Lien copié !"); }
    } catch {}
  }
  async function setMode(newMode) { if (isHost) await update(ref(db, `rooms/${code}/meta`), { mode: newMode }); }
  async function setQuiz(quizId) { if (isHost) await update(ref(db, `rooms/${code}/meta`), { quizId }); }
  async function createTeams(n = 2) {
    if (!isHost) return;
    const chosen = TEAM_PRESETS.slice(0, Math.max(2, Math.min(4, n)));
    const payload = {};
    chosen.forEach((t, i) => { payload[`t${i+1}`] = { name: t.name, color: t.color, score: 0 }; });
    await update(ref(db, `rooms/${code}/meta`), { mode: "équipes", teams: payload });
    // retire teamId existants
    const updates = {};
    players.forEach(p => { updates[`rooms/${code}/players/${p.uid}/teamId`] = ""; });
    await update(ref(db), updates);
  }
  async function autoAssignBalanced() {
    if (!isHost || !modeTeams || teamsList.length === 0) return;
    const sorted = players.slice().sort((a, b) => (a.joinedAt||0) - (b.joinedAt||0));
    const updates = {};
    sorted.forEach((p, idx) => { updates[`rooms/${code}/players/${p.uid}/teamId`] = teamsList[idx % teamsList.length].id; });
    await update(ref(db), updates);
  }
  async function movePlayerToTeam(uid, teamId) { if (isHost) await update(ref(db, `rooms/${code}/players/${uid}`), { teamId }); }
  async function kick(uid) {
    if (!isHost) return;
    const who = players.find(p => p.uid === uid)?.name || "ce joueur";
    if (confirm(`Kicker ${who} ?`)) await remove(ref(db, `rooms/${code}/players/${uid}`));
  }
  async function startGame() {
    if (!isHost) return;
    await set(ref(db, `rooms/${code}/state`), {
      phase: "playing",
      currentIndex: 0,
      revealed: false,
      lockUid: null,
      lastRevealAt: 0,
      elapsedAcc: 0,
      pausedAt: null,
      lockedAt: null,
      buzzBanner: ""
    });
    router.replace(`/game/${code}/host`);
  }

  const quizTitle = useMemo(() => {
    const q = manifest.find(q => q.id === meta?.quizId);
    return q?.title || (meta?.quizId?.replace(/-/g, " ") || "—");
  }, [manifest, meta?.quizId]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Lobby — {quizTitle}</h1>
          <div className="text-sm opacity-70">Code: <b>{code}</b> {state?.phase === "ended" && <span className="ml-2">(Partie terminée)</span>}</div>
        </div>

        {isHost ? (
          <div className="flex gap-2">
            <button className="btn" onClick={toggleInvite}>
              {showInvite ? "Masquer l'invitation" : "Afficher l'invitation"}
            </button>
            <Link href={`/`} className="btn">Quitter</Link>
          </div>
        ) : (
          <Link href={`/join?code=${code}`} className="btn">Inviter un ami</Link>
        )}
      </header>

      {/* Bloc invitation (QR + partage) — host seulement */}
      {isHost && showInvite && (
        <section className="card">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Qr value={roomUrl} />
            <div className="grow">
              <div className="text-lg font-bold">Invite des joueurs</div>
              <div className="mt-1 text-sm break-all">{roomUrl}</div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button className="btn btn-primary" onClick={shareRoom}>Partager</button>
                <button className="btn" onClick={async ()=>{ await navigator.clipboard.writeText(roomUrl); alert("Lien copié !"); }}>Copier le lien</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Paramètres / actions — HOST UNIQUEMENT */}
      {isHost && (
        <section className="grid md:grid-cols-3 gap-4">
          <div className="card space-y-3">
            <div className="font-bold">Mode de jeu</div>
            <div className="flex gap-2">
              <button className={`btn ${!modeTeams ? "btn-accent" : ""}`} onClick={()=>setMode("individuel")}>Individuel</button>
              <button className={`btn ${modeTeams ? "btn-accent" : ""}`} onClick={()=>setMode("équipes")}>Équipes</button>
            </div>

            {modeTeams && (
              <>
                <div className="font-bold mt-2">Équipes (2 à 4)</div>
                <div className="flex gap-2">
                  {[2,3,4].map(n=>(
                    <button key={n} className="btn" onClick={()=>createTeams(n)}>{n} équipes</button>
                  ))}
                </div>

                {teamsList.length > 0 && (
                  <>
                    <div className="font-bold">Équilibrage</div>
                    <button className="btn" onClick={autoAssignBalanced}>Auto-assigner (équilibré)</button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="card space-y-3">
            <div className="font-bold">Quiz</div>
            <select
              className="card w-full"
              value={meta?.quizId || ""}
              onChange={(e)=>setQuiz(e.target.value)}
            >
              <option value="" disabled>— Choisir —</option>
              {manifest.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>

            <div className="text-sm opacity-70">
              Choisis un quiz, puis démarre la partie.
            </div>
          </div>

          <div className="card space-y-3">
            <div className="font-bold">Actions</div>
            <button className="btn btn-primary w-full" disabled={!meta?.quizId} onClick={startGame}>
              Démarrer la partie
            </button>
            <Link href={`/`} className="btn w-full">Retour accueil</Link>
          </div>
        </section>
      )}

      {/* Version joueur : simple info d'attente (pas d’actions host) */}
      {!isHost && (
        <section className="card">
          <div className="font-bold mb-1">En attente de l’animateur…</div>
          <div className="text-sm opacity-70">
            L’animateur configure le mode et le quiz. La partie démarrera bientôt.
          </div>
        </section>
      )}

      {/* Liste joueurs (kick & team select visibles seulement pour host) */}
      <section className="card">
        <div className="font-bold mb-3">Joueurs ({players.length})</div>
        {players.length === 0 ? (
          <div className="opacity-70">En attente de joueurs…</div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2">
            {players.map(p => {
              const team = p.teamId && teams[p.teamId] ? teams[p.teamId] : null;
              return (
                <li key={p.uid} className="card flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {team ? (
                      <span className="px-2 py-0.5 rounded-xl border-2 border-black text-xs" style={{ backgroundColor: team.color }}>
                        {team.name}
                      </span>
                    ) : modeTeams ? (
                      <span className="px-2 py-0.5 rounded-xl border-2 border-dashed text-xs">—</span>
                    ) : null}
                    <span className="font-bold">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHost && modeTeams && teamsList.length > 0 && (
                      <select
                        className="card"
                        value={p.teamId || ""}
                        onChange={(e)=>movePlayerToTeam(p.uid, e.target.value)}
                      >
                        <option value="">—</option>
                        {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    {isHost && (
                      <button className="btn" onClick={()=>kick(p.uid)}>Kicker</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="text-center text-xs opacity-60">
        <div>Room <b>{code}</b> — {isHost ? "Vous êtes l'animateur" : "Vous êtes joueur"}</div>
        <div className="mt-1">
          {isHost
            ? <Link className="underline" href={`/game/${code}/host`}>Aller à l'écran animateur</Link>
            : <Link className="underline" href={`/game/${code}/play`}>Aller à l'écran joueur</Link>}
        </div>
      </footer>
    </main>
  );
}
