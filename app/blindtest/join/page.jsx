import { Suspense } from "react";
import JoinClient from "./page.client";

export default function JoinAlibiPage({ searchParams }) {
  const code = searchParams?.code || "";
  return (
    <Suspense fallback={<div className="loading-screen">Chargement...</div>}>
      <JoinClient initialCode={code} />
    </Suspense>
  );
}
