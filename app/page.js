"use client";
import Link from "next/link";
export default function Home() {
  return (
    <main className="p-6 max-w-xl mx-auto space-y-8">
      <h1 className="text-4xl font-black">Let'sQueeeze</h1>
      <p className="text-lg opacity-80">Choisissez votre jeu</p>

      <div className="grid gap-6">
        {/* Quiz Buzzer */}
        <div className="border-2 border-primary rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold">🎯 Quiz Buzzer</h2>
          <p className="text-sm opacity-70">Jeu de quiz multijoueur avec buzzer en temps réel</p>
          <div className="grid gap-3">
            <Link className="btn btn-primary text-center" href="/host">Créer une partie</Link>
            <Link className="btn btn-outline text-center" href="/join">Rejoindre une partie</Link>
          </div>
        </div>

        {/* ALIBI */}
        <div className="border-2 border-accent rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold">🕵️ ALIBI</h2>
          <p className="text-sm opacity-70">Interrogatoire d'accusés - Trouvez les incohérences !</p>
          <div className="grid gap-3">
            <Link className="btn btn-accent text-center" href="/alibi">Créer une partie</Link>
            <Link className="btn btn-outline text-center" href="/alibi/join">Rejoindre une partie</Link>
          </div>
        </div>
      </div>

      <p className="text-sm opacity-70 text-center">Mobile-first • Jusqu'à 50 joueurs • Firebase RTDB</p>
    </main>
  );
}
