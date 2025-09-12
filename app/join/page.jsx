// app/join/page.jsx
import { Suspense } from "react";
import JoinClient from "./page.client";

export const dynamic = "force-dynamic"; // évite le prerender strict

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <JoinClient />
    </Suspense>
  );
}
