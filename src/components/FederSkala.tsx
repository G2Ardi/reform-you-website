"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";

export interface FederSkalaKurs {
  slug: string;
  name: string;
  dauerMinuten: number | null;
  hinweis: string | null;
  skalaArt: "POSITION" | "OHNE_FEDER";
  skalaPosition: number | null;
  skalaLabel: string | null;
}

interface FederSkalaProps {
  kurse: FederSkalaKurs[];
  /** Ziel fuer die Kursnamen, z. B. "/wassenberg/kurse#" */
  linkPrefix: string;
  /**
   * Nur auf der Kurse-Seite true: dort ist die Skala das Signaturmoment der
   * ganzen Seite, gepinnt und scrub-gebunden. Auf der Startseite laeuft nur
   * ein normales Scroll-Reveal, damit insgesamt hoechstens ein gepinnter
   * Abschnitt auf der Seite steht.
   */
  pinned?: boolean;
  titelTag?: "h2" | "h3";
}

export default function FederSkala({
  kurse,
  linkPrefix,
  pinned = false,
  titelTag = "h2",
}: FederSkalaProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const Titel = titelTag;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lines = root.querySelectorAll<HTMLElement>(".scale-line");
    const dots = root.querySelectorAll<HTMLElement>(".scale-dot");

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!pinned) {
        // Normales Reveal: Achse und Punkte fahren einmal sanft ein,
        // ohne Pin, ohne Scrub.
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(dots, { xPercent: -50, x: -24, opacity: 0 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        });
        tl.to(lines, { scaleX: 1, duration: 0.6, ease: "power2.out" }, 0);
        tl.to(
          dots,
          { x: 0, opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.08 },
          0.15,
        );
        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      }

      // Signaturmoment: gepinnter, scrub-gebundener Abschnitt. Die Achse
      // zieht sich auf, danach fahren die Punkte von links an ihre
      // Position, wie ein Wagen, der sich setzt.
      gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(dots, { xPercent: -50, x: -56, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top+=96",
          end: "+=135%",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.to(lines, { scaleX: 1, duration: 1, ease: "power2.out" }, 0);
      dots.forEach((dot, i) => {
        tl.to(
          dot,
          { x: 0, opacity: 1, duration: 1, ease: "power2.out" },
          0.25 + i * 0.16,
        );
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [pinned, kurse]);

  return (
    <div className={pinned ? "scale scale-pin" : "scale"} ref={rootRef}>
      <div className="scale-head">
        <p className="tag" style={{ color: "var(--sepia)" }}>
          Federspannung
        </p>
        <div className="scale-legend" aria-hidden="true">
          <span>leicht</span>
          <span>mittel</span>
          <span>schwer</span>
        </div>
      </div>

      {kurse.map((kurs) => (
        <div className="scale-row" key={kurs.slug}>
          <Titel className="scale-name">
            <Link href={`${linkPrefix}${kurs.slug}`}>
              {kurs.name.toLowerCase()}
            </Link>
            <span className="scale-note">
              {kurs.dauerMinuten ? `${kurs.dauerMinuten} Minuten` : "Dauer offen"}
              {kurs.hinweis ? ` · ${kurs.hinweis}` : ""}
            </span>
          </Titel>

          {kurs.skalaArt === "POSITION" ? (
            <div className="scale-track">
              <span className="scale-line" aria-hidden="true" />
              <span
                className="scale-dot"
                style={{ "--p": `${kurs.skalaPosition ?? 50}%` } as CSSProperties}
              >
                <span className="scale-dot-label">{kurs.skalaLabel}</span>
              </span>
            </div>
          ) : (
            <p className="scale-out">
              <span className="scale-ring" aria-hidden="true" />
              ohne feder, nicht auf der skala
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
