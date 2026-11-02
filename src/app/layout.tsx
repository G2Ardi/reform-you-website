import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import MotionSetup from "@/components/MotionSetup";
import StandortGate from "@/components/StandortGate";
import { getAlleStandorte } from "@/lib/repositories/standorte";

export const metadata: Metadata = {
  title: {
    default: "Reform You Pilates Studio",
    template: "%s – Reform You Pilates Studio",
  },
  description:
    "Reformer Pilates in kleinen Gruppen. Fünf Formate von sanft bis intensiv, Standorte Wassenberg und Wegberg.",
};

/**
 * Setzt vor dem ersten Zeichnen zwei Dinge auf <html>:
 * - Klasse "js": Die CSS-Regeln, die Abschnitte vor dem Scroll-Reveal
 *   ausblenden (".js .reveal"), greifen nur, wenn sie gesetzt ist. Ohne
 *   JavaScript bleibt alles von Anfang an sichtbar.
 * - Attribut "data-standort-ok": gesetzt, wenn in diesem Besuch (Tab) schon
 *   ein Standort gewählt wurde. Fehlt es, zeigt das Pflicht-Popup die
 *   Standortwahl (siehe StandortGate), ohne dass es nach dem Laden aufblitzt.
 *
 * Bewusst ueber next/script mit strategy="beforeInteractive", nicht ueber
 * ein rohes <script>-Tag, siehe Kommentar der Vorversion: ein rohes Tag
 * erzeugt bei erneutem Client-Rendering eine React-Warnung.
 */
function BootstrapScript() {
  return (
    <Script id="js-flag" strategy="beforeInteractive">
      {
        "document.documentElement.classList.add('js');try{if(sessionStorage.getItem('ry-standort-ok')==='1'){document.documentElement.setAttribute('data-standort-ok','')}}catch(e){}"
      }
    </Script>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const standorte = await getAlleStandorte();

  return (
    // suppressHydrationWarning nur hier, weil BootstrapScript oben bewusst
    // Klasse und Attribut auf <html> setzt, bevor React hydratisiert.
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Schrift: Cormorant Garamond für Überschriften (weich, hochwertig,
          gut lesbar, anders als die harten Haarlinien einer Didone) und Jost
          für Fließtext, Knöpfe und Beschriftungen (klar, geometrisch,
          boutique-typisch). Als <link> geladen statt next/font, wie in der
          Vorversion, damit die variable Gewichtsachse von Jost erhalten bleibt.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@300..700&display=swap"
          rel="stylesheet"
        />
        <BootstrapScript />
      </head>
      <body>
        {children}
        <StandortGate
          standorte={standorte.map((s) => ({ slug: s.slug, name: s.name, hinweis: s.hinweis }))}
        />
        <MotionSetup />
      </body>
    </html>
  );
}
