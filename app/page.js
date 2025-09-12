"use client";
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
