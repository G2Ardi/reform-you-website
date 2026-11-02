"use client";

import Image from "next/image";
import Link from "next/link";
import { merkeStandortWahl } from "@/lib/standort-cookie";

interface PickerStandort {
  slug: string;
  name: string;
  hinweis: string | null;
}

/** Echte Fotos je Standort, siehe public/bilder. */
const STANDORT_BILD: Record<string, string> = {
  wassenberg: "/bilder/standort-wassenberg.jpg",
  wegberg: "/bilder/standort-wegberg.jpg",
};

/**
 * Zwei gleichwertige Auswahlflächen, auf jeder Breite nebeneinander (auch auf
 * dem Handy, ohne Scrollen). Die ganze Fläche ist der Link. Wird auf der
 * Startseite und im Pflicht-Popup verwendet.
 */
export default function StandortPicker({
  standorte,
  onWaehle,
}: {
  standorte: PickerStandort[];
  /** Im Popup: statt Navigation zur Startseite des Standorts die aktuelle Seite wechseln */
  onWaehle?: (slug: string) => void;
}) {
  return (
    <div className="picker">
      {standorte.map((s) => (
        <Link
          key={s.slug}
          href={`/${s.slug}`}
          className="picker-tile"
          onClick={(e) => {
            merkeStandortWahl(s.slug);
            if (onWaehle) {
              e.preventDefault();
              onWaehle(s.slug);
            }
          }}
        >
          <span className="picker-bild">
            {STANDORT_BILD[s.slug] ? (
              <Image
                src={STANDORT_BILD[s.slug]}
                alt=""
                fill
                sizes="(min-width: 56rem) 28rem, 46vw"
                style={{ objectFit: "cover" }}
                priority
              />
            ) : null}
          </span>
          <span className="picker-label">
            <span className="picker-kicker">Studio</span>
            <span className="picker-name">{s.name.toLowerCase()}</span>
            {s.hinweis ? <span className="picker-hinweis">{s.hinweis}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
