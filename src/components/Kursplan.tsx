"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Flag from "@/components/Flag";
import BuchenForm from "@/components/forms/BuchenForm";

export interface KursplanTermin {
  id: string;
  beginnIso: string;
  endeIso: string;
  kapazitaet: number;
  frei: number;
  kapazitaetOffen: boolean;
  ausgefallen: boolean;
  trainerName: string | null;
  kursName: string;
  skalaLabel: string | null;
  karteGueltig: boolean;
  preisLabel: string;
  standortSlug: string;
  standortName: string;
  nutzbareKarten: { id: string; label: string }[];
}

export interface KursplanStandort {
  slug: string;
  name: string;
}

const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Woche beginnt montags, unabhaengig von der Browser-Locale. */
function montagDerWoche(datum: Date): Date {
  const d = new Date(datum);
  d.setHours(0, 0, 0, 0);
  const tag = d.getDay();
  const versatz = tag === 0 ? -6 : 1 - tag;
  d.setDate(d.getDate() + versatz);
  return d;
}

function addTage(datum: Date, anzahl: number): Date {
  const d = new Date(datum);
  d.setDate(d.getDate() + anzahl);
  return d;
}

function istGleicherTag(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTag(datum: Date): string {
  return datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatUhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/** Grenzen des serverseitig geladenen Zeitfensters, siehe
 * getTermineImFensterFuerStandort. Verhindert sinnloses Weiterklicken in
 * Wochen ohne jede Datenbasis. */
const WOCHEN_ZURUECK_MAX = 8;
const WOCHEN_VORAUS_MAX = 16;

export default function Kursplan({
  aktuellerStandortSlug,
  standorte,
  eingeloggt,
  termine,
}: {
  aktuellerStandortSlug: string;
  standorte: KursplanStandort[];
  eingeloggt: boolean;
  termine: KursplanTermin[];
}) {
  const [wochenVersatz, setWochenVersatz] = useState(0);
  const [suche, setSuche] = useState("");
  const [aktivitaet, setAktivitaet] = useState("");
  const [niveau, setNiveau] = useState("");
  const [lehrkraft, setLehrkraft] = useState("");
  const [standortFilter, setStandortFilter] = useState(aktuellerStandortSlug);
  const [offenesFormular, setOffenesFormular] = useState<string | null>(null);

  const aktivitaeten = useMemo(
    () => Array.from(new Set(termine.map((t) => t.kursName))).sort((a, b) => a.localeCompare(b, "de")),
    [termine],
  );
  const niveaus = useMemo(
    () =>
      Array.from(new Set(termine.map((t) => t.skalaLabel).filter((v): v is string => Boolean(v)))).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    [termine],
  );
  const lehrkraefte = useMemo(
    () =>
      Array.from(new Set(termine.map((t) => t.trainerName).filter((v): v is string => Boolean(v)))).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    [termine],
  );

  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    return termine.filter((t) => {
      if (standortFilter && t.standortSlug !== standortFilter) return false;
      if (suchbegriff && !t.kursName.toLowerCase().includes(suchbegriff)) return false;
      if (aktivitaet && t.kursName !== aktivitaet) return false;
      if (niveau && t.skalaLabel !== niveau) return false;
      if (lehrkraft && t.trainerName !== lehrkraft) return false;
      return true;
    });
  }, [termine, suche, aktivitaet, niveau, lehrkraft, standortFilter]);

  const montag = montagDerWoche(addTage(new Date(), wochenVersatz * 7));
  const tage = Array.from({ length: 7 }, (_, i) => addTage(montag, i));
  const jetzt = new Date();

  const proTag = tage.map((tag) =>
    gefiltert
      .filter((t) => istGleicherTag(new Date(t.beginnIso), tag))
      .sort((a, b) => a.beginnIso.localeCompare(b.beginnIso)),
  );

  return (
    <div className="kalender">
      <div className="kalender-kopf">
        <div className="kalender-nav">
          <button
            type="button"
            className="kalender-pfeil"
            aria-label="Vorherige Woche"
            disabled={wochenVersatz <= -WOCHEN_ZURUECK_MAX}
            onClick={() => setWochenVersatz((w) => Math.max(-WOCHEN_ZURUECK_MAX, w - 1))}
          >
            ‹
          </button>
          <span className="kalender-woche">
            Mo {formatTag(tage[0])} – So {formatTag(tage[6])}
          </span>
          <button
            type="button"
            className="kalender-pfeil"
            aria-label="Nächste Woche"
            disabled={wochenVersatz >= WOCHEN_VORAUS_MAX}
            onClick={() => setWochenVersatz((w) => Math.min(WOCHEN_VORAUS_MAX, w + 1))}
          >
            ›
          </button>
          {wochenVersatz !== 0 ? (
            <button type="button" className="btn-unstyled small go kalender-heute" onClick={() => setWochenVersatz(0)}>
              heute
            </button>
          ) : null}
        </div>

        <div className="kalender-standorte" role="group" aria-label="Nach Standort filtern">
          <button
            type="button"
            className={`pill-filter${standortFilter === "" ? " pill-filter-aktiv" : ""}`}
            onClick={() => setStandortFilter("")}
          >
            Beide Standorte
          </button>
          {standorte.map((s) => (
            <button
              key={s.slug}
              type="button"
              className={`pill-filter${standortFilter === s.slug ? " pill-filter-aktiv" : ""}`}
              onClick={() => setStandortFilter(s.slug)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="kalender-filter">
          <input
            className="input"
            type="search"
            placeholder="Suche…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            aria-label="Kurse durchsuchen"
          />
          <select
            className="input"
            value={aktivitaet}
            onChange={(e) => setAktivitaet(e.target.value)}
            aria-label="Nach Kurs filtern"
          >
            <option value="">Alle Kurse</option>
            {aktivitaeten.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
            aria-label="Nach Niveau filtern"
          >
            <option value="">Alle Niveaus</option>
            {niveaus.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {lehrkraefte.length > 0 ? (
            <select
              className="input"
              value={lehrkraft}
              onChange={(e) => setLehrkraft(e.target.value)}
              aria-label="Nach Lehrkraft filtern"
            >
              <option value="">Alle Lehrkräfte</option>
              {lehrkraefte.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="kalender-grid">
        {tage.map((tag, i) => (
          <div className="kalender-tag" key={tag.toISOString()}>
            <div className="kalender-tag-kopf">
              <span className="kalender-tag-name">{WOCHENTAGE_KURZ[i]}</span>
              <span className="kalender-tag-nummer">{tag.getDate()}</span>
            </div>
            <div className="kalender-karten">
              {proTag[i].length === 0 ? (
                <p className="small muted kalender-leer">–</p>
              ) : (
                proTag[i].map((t) => {
                  const istVergangen = new Date(t.beginnIso).getTime() <= jetzt.getTime();
                  const istVoll = t.frei <= 0;

                  return (
                    <article className="kurs-karte" key={t.id}>
                      <p className="tag kurs-karte-titel">{t.kursName}</p>
                      <p className="small kurs-karte-zeit">
                        {formatUhrzeit(t.beginnIso)} – {formatUhrzeit(t.endeIso)}
                      </p>
                      <span className="pill pill-standort kurs-karte-standort">{t.standortName}</span>
                      {t.skalaLabel ? <span className="pill pill-off kurs-karte-niveau">{t.skalaLabel}</span> : null}
                      {t.trainerName ? <p className="small muted kurs-karte-trainer">{t.trainerName}</p> : null}

                      <p className="small muted kurs-karte-plaetze">
                        {t.kapazitaetOffen ? (
                          <Flag>Kapazität offen</Flag>
                        ) : istVoll ? (
                          "ausgebucht"
                        ) : (
                          `${t.frei}/${t.kapazitaet} frei`
                        )}
                      </p>

                      {!t.karteGueltig ? (
                        <p className="small">
                          <Flag>Ob Karten hier gelten, ist nicht bestätigt</Flag>
                        </p>
                      ) : null}

                      {t.ausgefallen ? (
                        <p className="small kurs-karte-status">Kurs ausgefallen</p>
                      ) : istVergangen ? (
                        <p className="small kurs-karte-status">vergangen</p>
                      ) : !eingeloggt ? (
                        <Link className="go small" href={`/${t.standortSlug}/konto/login`}>
                          Login zum Buchen
                        </Link>
                      ) : offenesFormular === t.id ? (
                        <div className="kurs-karte-formular">
                          <BuchenForm
                            standortSlug={t.standortSlug}
                            kursTerminId={t.id}
                            preisLabel={t.preisLabel}
                            karten={t.nutzbareKarten}
                            wartelisteNoetig={istVoll}
                          />
                          <button
                            type="button"
                            className="btn-unstyled small muted"
                            onClick={() => setOffenesFormular(null)}
                          >
                            abbrechen
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn btn-klein" onClick={() => setOffenesFormular(t.id)}>
                          {istVoll ? "Warteliste" : "Buchen"}
                        </button>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
