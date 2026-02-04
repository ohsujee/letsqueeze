"use client";
import { useParams } from "next/navigation";
import BlindTestHostView from "@/components/game/BlindTestHostView";

export default function BlindTestHostPage() {
  const { code } = useParams();

  return <BlindTestHostView code={code} isActualHost={true} />;
}
