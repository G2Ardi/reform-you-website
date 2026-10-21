"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Einmal pro Seite eingebunden (im Root-Layout). Ruft
 * ScrollTrigger.refresh() auf, nachdem Webfonts geladen sind, sonst
 * verschiebt sich die Pin-Hoehe der Federskala, weil sich die Zeilenhoehe
 * durch den Schriftwechsel noch aendert.
 */
export default function MotionSetup() {
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }, []);

  return null;
}
