"use client";
import { useParams } from "next/navigation";
import DeezTestHostView from "@/components/game/DeezTestHostView";

export default function DeezTestHostPage() {
  const { code } = useParams();

  return <DeezTestHostView code={code} isActualHost={true} />;
}
