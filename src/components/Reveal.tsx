"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Verzoegerung in Sekunden, fuer leicht versetzte Nachbarelemente */
  delay?: number;
}

/**
 * Sanftes Scroll-Reveal fuer normale Abschnitte: kleiner y-Versatz,
 * einmaliges Triggern, unter prefers-reduced-motion komplett abgeschaltet.
 * Die CSS-Klasse "reveal" haelt den Vorab-Zustand (siehe globals.css),
 * damit ohne JavaScript nichts unsichtbar bleibt: die ausblendende Regel
 * gilt nur, wenn ein Inline-Script im Kopf die Klasse "js" gesetzt hat.
 */
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => mm.revert();
  }, [delay]);

  return (
    <div ref={ref} className={["reveal", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
