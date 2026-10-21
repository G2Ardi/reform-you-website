import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import MotionSetup from "@/components/MotionSetup";

export const metadata: Metadata = {
  title: {
    default: "Reform You Pilates Studio",
    template: "%s – Reform You Pilates Studio",
  },
  description:
    "Reformer Pilates in kleinen Gruppen. Fünf Formate von sanft bis intensiv, Standorte Wassenberg und Wegberg.",
};

/**
 * Setzt die Klasse "js" auf <html>, bevor React hydratisiert. Die CSS-Regeln,
 * die Abschnitte vor dem Scroll-Reveal ausblenden (siehe globals.css,
 * ".js .reveal"), greifen nur, wenn diese Klasse gesetzt ist. Ohne
 * JavaScript bleibt dadurch alles von Anfang an sichtbar, statt unsichtbar
 * zu haengen.
 *
 * Bewusst ueber next/script mit strategy="beforeInteractive", nicht ueber
 * ein rohes <script>-Tag: ein rohes Tag wird von Next.js nur beim allerersten
 * Seitenaufruf in das HTML geschrieben. Wird der Baum aus irgendeinem Grund
 * spaeter erneut client-seitig gerendert (zum Beispiel nach einem
 * Dev-Server-Neustart mit noch offenem Tab), versucht React, das Tag selbst
 * zu rendern, und meldet "Scripts inside React components are never
 * executed when rendering on the client". next/script mit
 * beforeInteractive ist genau fuer diesen Root-Layout-Fall vorgesehen und
 * wird von Next.js ausserhalb des normalen React-Renderpfads eingefuegt.
 */
function BootstrapScript() {
  return (
    <Script id="js-flag" strategy="beforeInteractive">
      {"document.documentElement.classList.add('js');"}
    </Script>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning nur hier, weil BootstrapScript oben bewusst
    // die Klasse "js" auf <html> setzt, bevor React hydratisiert. Das ist
    // kein Fehler, sondern der No-JS-Fallback, siehe Kommentar oben. Ohne
    // dieses Flag zeigt React bei jeder Seite eine Hydration-Warnung dafuer.
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Bewusst kein next/font: next/font reduziert variable Google
          Fonts auf die Gewichtsachse, hier wird zusaetzlich die
          Laufweiten-Achse "wdth" gebraucht (Kleinlabels auf wdth 125),
          die nur die echte CSS2-Variable-Datei liefert.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..500&family=Archivo:ital,wdth,wght@0,62..125,400..700;1,62..125,400..600&display=swap"
          rel="stylesheet"
        />
        <BootstrapScript />
      </head>
      <body>
        {children}
        <MotionSetup />
      </body>
    </html>
  );
}
