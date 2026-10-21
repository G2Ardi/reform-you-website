import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Zentrale GSAP-Registrierung. Nur aus "use client"-Komponenten
 * importieren (Reveal, FederSkala, MotionSetup), nie aus Server
 * Components, damit das Modul nie waehrend der SSR-Ausgabe auf window
 * zugreifen muss.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
