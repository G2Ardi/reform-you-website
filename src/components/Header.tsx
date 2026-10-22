"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  /** Fehlt auf der Standortauswahl: dort gibt es noch keine Navigationsziele */
  standort?: { slug: string; name: string } | null;
  /** true auf Innenseiten ohne Hero-Foto hinter dem Kopfbereich */
  solid?: boolean;
  bookingUrl?: string;
}

export default function Header({ standort = null, solid = false, bookingUrl }: HeaderProps) {
  const effektiveBookingUrl = bookingUrl ?? (standort ? `/${standort.slug}/buchen` : "https://www.reform-you.de/book-online");
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        burgerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 62rem)");
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const home = standort ? `/${standort.slug}` : "/";

  const navLinks = standort
    ? [
        { href: `/${standort.slug}/kurse`, label: "Kurse" },
        { href: `/${standort.slug}/abo`, label: "Abo & Preise" },
        { href: `/${standort.slug}/studio`, label: "Studio" },
        { href: `/${standort.slug}/kontakt`, label: "Kontakt" },
      ]
    : [];

  return (
    <header className={`head${solid ? " head-solid" : ""}`}>
      <div className="shell head-in">
        <Link
          className="mark"
          href={home}
          aria-label="Reform You Pilates Studio, zur Startseite"
        >
          <Image
            src={solid ? "/logo/reformyou-logo-dark.png" : "/logo/reformyou-logo-light.png"}
            alt=""
            width={888}
            height={510}
            priority
            className="mark-logo"
          />
        </Link>

        {standort ? (
          <>
            <button
              ref={burgerRef}
              className="burger"
              type="button"
              aria-expanded={open}
              aria-controls="hauptnavigation"
              onClick={() => setOpen((v) => !v)}
            >
              Menü
            </button>
            <nav
              className="nav"
              id="hauptnavigation"
              aria-label="Hauptnavigation"
              data-open={open ? "true" : "false"}
            >
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                >
                  {l.label}
                </Link>
              ))}
              <Link href={`/${standort.slug}/konto/profil`}>Mein Konto</Link>
              <Link className="nav-cta" href={effektiveBookingUrl}>
                Termin buchen
              </Link>
            </nav>
          </>
        ) : null}
      </div>

      {standort ? (
        /* Immer sichtbare Standortwahl direkt in der Kopfzeile, nicht hinter
           dem Burger-Menü versteckt, das war auf dem Handy zu unintuitiv. */
        <div className="shell head-quickbar">
          <Link href="/?wahl=1" className="head-quickbar-link">
            <span className="head-quickbar-label">Standort</span>
            <span className="head-quickbar-name">{standort.name}</span>
            <span className="head-quickbar-arrow" aria-hidden="true">wechseln ›</span>
          </Link>
        </div>
      ) : null}
    </header>
  );
}
