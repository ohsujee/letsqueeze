// app/join/page.jsx  (SERVER COMPONENT — pas de "use client")
import { Suspense } from "react";
import JoinClient from "./page.client";

export const dynamic = "force-dynamic"; // évite le prerender strict

export default function Page({ searchParams }) {
  const initialCode = typeof searchParams?.code === "string" ? searchParams.code : "";
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <JoinClient initialCode={initialCode} />
    </Suspense>
  );
}
