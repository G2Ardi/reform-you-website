"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import StandortPicker from "@/components/StandortPicker";

interface GateStandort {
  slug: string;
  name: string;
  hinweis: string | null;
}

/**
 * Pflicht-Popup: Bei jedem Besuch muss zuerst ein Standort gewählt werden,
 * auch wenn jemand direkt auf einer Unterseite landet. Das Popup hat keinen
 * Schließen-Knopf. Ob es sichtbar ist, entscheidet allein das Attribut
 * data-standort-ok auf <html>, das ein kleines Skript im Kopf der Seite
 * vor dem ersten Zeichnen setzt (siehe layout.tsx), damit nichts aufblitzt.
 *
 * Auf der Startseite "/" (dort ist die Standortwahl die Seite selbst) und
 * im Admin-Bereich erscheint es nicht.
 */
export default function StandortGate({ standorte }: { standorte: GateStandort[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const ersterLink = useRef<HTMLDivElement>(null);

  const ausgenommen = pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/api");

  useEffect(() => {
    if (ausgenommen) return;
    if (document.documentElement.hasAttribute("data-standort-ok")) return;
    ersterLink.current?.querySelector<HTMLElement>("a")?.focus();
  }, [ausgenommen]);

  if (ausgenommen) return null;

  function waehle(slug: string) {
    const segmente = pathname.split("/");
    const ersteSeite = segmente[1];
    const bekannt = standorte.some((s) => s.slug === ersteSeite);
    if (bekannt) {
      segmente[1] = slug;
      const ziel = segmente.join("/") + (typeof window !== "undefined" ? window.location.search : "");
      if (ersteSeite !== slug) router.push(ziel);
    } else {
      router.push(`/${slug}`);
    }
  }

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-titel">
      <div className="gate-innen">
        <Image
          src="/logo/reformyou-logo-dark.png"
          alt="Reform You Pilates Studio"
          width={888}
          height={510}
          className="gate-logo"
        />
        <h2 id="gate-titel" className="t-2 gate-titel">
          wo möchtest du trainieren?
        </h2>
        <div ref={ersterLink}>
          <StandortPicker standorte={standorte} onWaehle={waehle} />
        </div>
      </div>
    </div>
  );
}
