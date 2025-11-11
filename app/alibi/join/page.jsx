// app/alibi/join/page.jsx  (SERVER COMPONENT)
import { Suspense } from "react";
import JoinClient from "./page.client";

export const dynamic = "force-dynamic";

export default async function Page(props) {
  const searchParams = await props.searchParams;
  const initialCode = typeof searchParams?.code === "string" ? searchParams.code : "";
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <JoinClient initialCode={initialCode} />
    </Suspense>
  );
}
