"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main data-theme="home" className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="home-title">Let'sQueeeze</h1>
          <p className="home-subtitle">Choisissez votre univers</p>
        </div>

        {/* Game Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Quiz Buzzer */}
          <div className="game-card space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Quiz Buzzer
              </h2>
              <p className="text-white/80 text-sm mb-4">
                Jeu de quiz multijoueur avec buzzer en temps réel
              </p>
            </div>
            <div className="space-y-2">
              <Link
                className="home-btn home-btn-primary w-full text-center block"
                href="/host"
              >
                Créer une partie
              </Link>
              <Link
                className="home-btn home-btn-outline w-full text-center block"
                href="/join"
              >
                Rejoindre
              </Link>
            </div>
          </div>

          {/* ALIBI */}
          <div className="game-card space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">🕵️</div>
              <h2 className="text-2xl font-bold text-white mb-2">ALIBI</h2>
              <p className="text-white/80 text-sm mb-4">
                Interrogatoire d'accusés - Trouvez les incohérences !
              </p>
            </div>
            <div className="space-y-2">
              <Link
                className="home-btn home-btn-primary w-full text-center block"
                href="/alibi"
              >
                Créer une partie
              </Link>
              <Link
                className="home-btn home-btn-outline w-full text-center block"
                href="/alibi/join"
              >
                Rejoindre
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-white/70 text-xs">
            Mobile-first • Jusqu'à 50 joueurs • Firebase RTDB
          </p>
        </div>
      </div>
    </main>
  );
}
