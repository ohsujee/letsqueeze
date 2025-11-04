"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main data-theme="home" className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating particles */}
      <div className="floating-particles"></div>

      <div className="max-w-5xl w-full space-y-12 relative z-10">
        {/* Main Title */}
        <div className="text-center space-y-4">
          <h1 className="home-title">Let'sQueeeze</h1>
          <p className="home-subtitle">Choisissez votre univers de jeu</p>
        </div>

        {/* Game Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Quiz Buzzer Card */}
          <div className="game-card-3d quiz group">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                🎯
              </div>
              <h2 className="text-3xl font-black text-white">Quiz Buzzer</h2>
              <p className="text-white/80 text-base">
                Jeu de quiz multijoueur avec buzzer en temps réel
              </p>
              <div className="pt-4 space-y-3">
                <Link
                  className="btn-3d block w-full text-center"
                  href="/host"
                >
                  Créer une partie
                </Link>
                <Link
                  className="btn-3d outline block w-full text-center"
                  href="/join"
                >
                  Rejoindre une partie
                </Link>
              </div>
            </div>
          </div>

          {/* ALIBI Card */}
          <div className="game-card-3d alibi group">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                🕵️
              </div>
              <h2 className="text-3xl font-black text-white">ALIBI</h2>
              <p className="text-white/80 text-base">
                Interrogatoire d'accusés - Trouvez les incohérences !
              </p>
              <div className="pt-4 space-y-3">
                <Link
                  className="btn-3d orange block w-full text-center"
                  href="/alibi"
                >
                  Créer une partie
                </Link>
                <Link
                  className="btn-3d outline block w-full text-center"
                  href="/alibi/join"
                >
                  Rejoindre une partie
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-white/70 text-sm backdrop-blur-sm bg-white/10 inline-block px-6 py-3 rounded-full border border-white/20">
            Mobile-first • Jusqu'à 50 joueurs • Firebase RTDB
          </p>
        </div>
      </div>
    </main>
  );
}
