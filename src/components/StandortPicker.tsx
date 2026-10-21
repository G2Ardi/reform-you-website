"use client";

import Link from "next/link";
import FigurePlaceholder from "@/components/FigurePlaceholder";
import Reveal from "@/components/Reveal";
import { setStandortCookie } from "@/lib/standort-cookie";

interface PickerStandort {
  slug: string;
  name: string;
  hinweis: string | null;
}

/** Platzhalterfotos je Standort, siehe public/bilder. Sobald echte Fotos von
 * Janina kommen, hier nur den Pfad austauschen. */
const STANDORT_BILD: Record<string, string> = {
  wassenberg: "/bilder/standort-wassenberg.jpg",
  wegberg: "/bilder/standort-wegberg.jpg",
};

export default function StandortPicker({ standorte }: { standorte: PickerStandort[] }) {
  return (
    <div className="picker">
      {standorte.map((s, i) => (
        <Reveal key={s.slug} delay={i * 0.12}>
          <Link
            href={`/${s.slug}`}
            className="picker-tile"
            onClick={() => setStandortCookie(s.slug)}
          >
            <FigurePlaceholder
              ratio="1610"
              hint={`Standortauswahl ${s.name} · Querformat`}
              className="picker-figure"
              src={STANDORT_BILD[s.slug]}
              alt={`Reform You ${s.name}, Platzhalterfoto`}
            />
            <span className="picker-label">
              <span className="picker-name">{s.name.toLowerCase()}</span>
              {s.hinweis ? <span className="picker-hinweis">{s.hinweis}</span> : null}
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
