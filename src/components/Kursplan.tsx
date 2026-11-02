"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Status der eigenen Buchung für diesen Termin, falls eingeloggt */
  meinStatus: "GEBUCHT" | "WARTELISTE" | null;
  meineBuchungId: string | null;
}

export interface KursplanStandort {
  slug: string;
  name: string;
}

const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WOCHENTAGE_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

/**
 * Tage werden als "JJJJ-MM-TT" in deutscher Zeit (Europe/Berlin) geführt, nie
 * über die Zeitzone des Geräts. Sonst zeigt der Server (UTC) andere Tage und
 * Uhrzeiten als der Browser, und Termine rutschen um einen Tag oder eine
 * Stunde.
 */
const TZ = "Europe/Berlin";

function tagStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function parseTag(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function addTage(s: string, anzahl: number): string {
  const d = parseTag(s);
  d.setUTCDate(d.getUTCDate() + anzahl);
  return d.toISOString().slice(0, 10);
}

/** Index 0 = Montag bis 6 = Sonntag */
function wochentagIndex(s: string): number {
  return (parseTag(s).getUTCDay() + 6) % 7;
}

function montagDerWoche(s: string): string {
  return addTage(s, -wochentagIndex(s));
}

function tageDazwischen(von: string, bis: string): number {
  return Math.round((parseTag(bis).getTime() - parseTag(von).getTime()) / (24 * 60 * 60 * 1000));
}

function formatTag(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}.${m}.`;
}

function formatUhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** Grenzen des serverseitig geladenen Zeitfensters, siehe
 * getTermineImFenster. Verhindert sinnloses Weiterklicken in Wochen ohne
 * jede Datenbasis. */
const WOCHEN_ZURUECK_MAX = 8;
const WOCHEN_VORAUS_MAX = 16;

export default function Kursplan({
  aktuellerStandortSlug,
  standorte,
  eingeloggt,
  termine,
  startTag,
}: {
  aktuellerStandortSlug: string;
  standorte: KursplanStandort[];
  eingeloggt: boolean;
  termine: KursplanTermin[];
  /** ISO-Datum (JJJJ-MM-TT), z. B. aus dem Link in der Wartelisten-Mail */
  startTag?: string;
}) {
  const heute = useMemo(() => tagStr(new Date()), []);
  const startDatum = useMemo(
    () => (startTag && /^\d{4}-\d{2}-\d{2}$/.test(startTag) ? startTag : heute),
    [startTag, heute],
  );

  const [wochenVersatz, setWochenVersatz] = useState(() => {
    const diff = Math.round(tageDazwischen(montagDerWoche(heute), montagDerWoche(startDatum)) / 7);
    return Math.max(-WOCHEN_ZURUECK_MAX, Math.min(WOCHEN_VORAUS_MAX, diff));
  });
  const [gewaehlterTag, setGewaehlterTag] = useState(startDatum);
  const [suche, setSuche] = useState("");
  const [aktivitaet, setAktivitaet] = useState("");
  const [niveau, setNiveau] = useState("");
  const [lehrkraft, setLehrkraft] = useState("");
  const [standortFilter, setStandortFilter] = useState(aktuellerStandortSlug);
  const [filterOffen, setFilterOffen] = useState(false);
  const [offenesFormular, setOffenesFormular] = useState<string | null>(null);
  const filterBereich = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOffen) return;
    function schliesse(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOffen(false);
    }
    document.addEventListener("keydown", schliesse);
    return () => document.removeEventListener("keydown", schliesse);
  }, [filterOffen]);

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

  const aktiveFilter = [suche.trim(), aktivitaet, niveau, lehrkraft].filter(Boolean).length;

  const montag = montagDerWoche(addTage(heute, wochenVersatz * 7));
  const tage = Array.from({ length: 7 }, (_, i) => addTage(montag, i));
  const jetzt = new Date();

  const proTag = tage.map((tag) =>
    gefiltert
      .filter((t) => tagStr(new Date(t.beginnIso)) === tag)
      .sort((a, b) => a.beginnIso.localeCompare(b.beginnIso)),
  );

  // Liegt der gewählte Tag nicht in der angezeigten Woche, springt die
  // Auswahl auf den ersten Tag dieser Woche (heute, falls enthalten).
  const gewaehltIndex = tage.indexOf(gewaehlterTag);
  const sichtbarerIndex = gewaehltIndex >= 0 ? gewaehltIndex : Math.max(0, tage.indexOf(heute));
  const gewaehlterTagDatum = tage[sichtbarerIndex];
  const termineAmTag = proTag[sichtbarerIndex];

  function filterZuruecksetzen() {
    setSuche("");
    setAktivitaet("");
    setNiveau("");
    setLehrkraft("");
  }

  function wocheWechseln(neu: number) {
    const begrenzt = Math.max(-WOCHEN_ZURUECK_MAX, Math.min(WOCHEN_VORAUS_MAX, neu));
    setWochenVersatz(begrenzt);
    setOffenesFormular(null);
    const neuerMontag = montagDerWoche(addTage(heute, begrenzt * 7));
    setGewaehlterTag(addTage(neuerMontag, sichtbarerIndex));
  }

  return (
    <div className="plan">
      <div className="plan-standorte" role="group" aria-label="Standort wählen">
        <div className="plan-pills">
          {standorte.map((s) => (
            <button
              key={s.slug}
              type="button"
              className={`pill-filter${standortFilter === s.slug ? " pill-filter-aktiv" : ""}`}
              aria-pressed={standortFilter === s.slug}
              onClick={() => setStandortFilter(s.slug)}
            >
              {s.name}
            </button>
          ))}
          <button
            type="button"
            className={`pill-filter${standortFilter === "" ? " pill-filter-aktiv" : ""}`}
            aria-pressed={standortFilter === ""}
            onClick={() => setStandortFilter("")}
          >
            Beide
          </button>
        </div>

        <div className="plan-filter-wrap" ref={filterBereich}>
          <button
            type="button"
            className={`plan-filter-knopf${filterOffen ? " plan-filter-knopf-offen" : ""}`}
            aria-expanded={filterOffen}
            aria-controls="plan-filter-feld"
            aria-label={aktiveFilter > 0 ? `Filter, ${aktiveFilter} aktiv` : "Filter"}
            onClick={() => setFilterOffen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                d="M4 7h9M17 7h3M4 17h3M11 17h9M13 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="plan-filter-text">Filter</span>
            {aktiveFilter > 0 ? <span className="plan-filter-zahl">{aktiveFilter}</span> : null}
          </button>

          {filterOffen ? (
            <div className="plan-filter-feld" id="plan-filter-feld">
              <div className="form-row">
                <label htmlFor="plan-suche">Suche</label>
                <input
                  id="plan-suche"
                  className="input"
                  type="search"
                  placeholder="Kursname"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="plan-kurs">Kurs</label>
                <select id="plan-kurs" className="input" value={aktivitaet} onChange={(e) => setAktivitaet(e.target.value)}>
                  <option value="">Alle Kurse</option>
                  {aktivitaeten.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="plan-niveau">Niveau</label>
                <select id="plan-niveau" className="input" value={niveau} onChange={(e) => setNiveau(e.target.value)}>
                  <option value="">Alle Niveaus</option>
                  {niveaus.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {lehrkraefte.length > 0 ? (
                <div className="form-row">
                  <label htmlFor="plan-lehrkraft">Lehrkraft</label>
                  <select
                    id="plan-lehrkraft"
                    className="input"
                    value={lehrkraft}
                    onChange={(e) => setLehrkraft(e.target.value)}
                  >
                    <option value="">Alle Lehrkräfte</option>
                    {lehrkraefte.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="plan-filter-aktionen">
                <button type="button" className="btn btn-klein" onClick={() => setFilterOffen(false)}>
                  Anzeigen
                </button>
                <button type="button" className="btn-unstyled small go" onClick={filterZuruecksetzen}>
                  Zurücksetzen
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="plan-woche">
        <button
          type="button"
          className="kalender-pfeil"
          aria-label="Vorherige Woche"
          disabled={wochenVersatz <= -WOCHEN_ZURUECK_MAX}
          onClick={() => wocheWechseln(wochenVersatz - 1)}
        >
          ‹
        </button>
        <span className="plan-woche-text">
          {formatTag(tage[0])} bis {formatTag(tage[6])}
        </span>
        <button
          type="button"
          className="kalender-pfeil"
          aria-label="Nächste Woche"
          disabled={wochenVersatz >= WOCHEN_VORAUS_MAX}
          onClick={() => wocheWechseln(wochenVersatz + 1)}
        >
          ›
        </button>
        {wochenVersatz !== 0 ? (
          <button
            type="button"
            className="btn-unstyled small go plan-heute"
            onClick={() => {
              setWochenVersatz(0);
              setGewaehlterTag(heute);
              setOffenesFormular(null);
            }}
          >
            heute
          </button>
        ) : null}
      </div>

      <div className="plan-tage" role="tablist" aria-label="Tag wählen">
        {tage.map((tag, i) => {
          const anzahl = proTag[i].length;
          const aktiv = i === sichtbarerIndex;
          const istHeute = tag === heute;
          return (
            <button
              key={tag}
              type="button"
              role="tab"
              aria-selected={aktiv}
              aria-label={`${WOCHENTAGE_LANG[i]}, ${formatTag(tag)}, ${anzahl === 0 ? "keine Kurse" : anzahl === 1 ? "1 Kurs" : `${anzahl} Kurse`}`}
              className={`plan-tag${aktiv ? " plan-tag-aktiv" : ""}${anzahl === 0 ? " plan-tag-leer" : ""}`}
              onClick={() => {
                setGewaehlterTag(tag);
                setOffenesFormular(null);
              }}
            >
              <span className="plan-tag-name">{WOCHENTAGE_KURZ[i]}</span>
              <span className="plan-tag-nummer">{Number(tag.slice(8))}</span>
              <span className="plan-tag-punkte" aria-hidden="true">
                {istHeute ? "heute" : anzahl > 0 ? "•".repeat(Math.min(anzahl, 4)) : ""}
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="plan-tag-titel t-3">
        {WOCHENTAGE_LANG[sichtbarerIndex]}, {formatTag(gewaehlterTagDatum)}{gewaehlterTagDatum.slice(0, 4)}
      </h2>

      {termineAmTag.length === 0 ? (
        <p className="muted plan-leer">
          An diesem Tag gibt es {aktiveFilter > 0 || standortFilter ? "mit dieser Auswahl " : ""}keine Kurse. Wähle einen
          anderen Tag{standortFilter ? " oder tippe oben auf Beide." : "."}
        </p>
      ) : (
        <ul className="plan-liste">
          {termineAmTag.map((t) => {
            const istVergangen = new Date(t.beginnIso).getTime() <= jetzt.getTime();
            const istVoll = t.frei <= 0;
            const loginZiel = `/${t.standortSlug}/konto/login?weiter=${encodeURIComponent(
              `/${t.standortSlug}/buchen?tag=${tagStr(new Date(t.beginnIso))}`,
            )}`;

            return (
              <li className="plan-termin" key={t.id}>
                <div className="plan-termin-zeit">
                  <span className="plan-termin-start">{formatUhrzeit(t.beginnIso)}</span>
                  <span className="plan-termin-ende">bis {formatUhrzeit(t.endeIso)}</span>
                </div>

                <div className="plan-termin-info">
                  <p className="plan-termin-titel">{t.kursName}</p>
                  <p className="plan-termin-meta">
                    <span className="pill pill-standort">{t.standortName}</span>
                    {t.skalaLabel ? <span className="pill pill-off">{t.skalaLabel}</span> : null}
                    {t.trainerName ? <span className="small muted">{t.trainerName}</span> : null}
                    <span className="small muted">
                      {t.kapazitaetOffen ? (
                        <Flag>Kapazität offen</Flag>
                      ) : istVoll ? (
                        "ausgebucht"
                      ) : (
                        `${t.frei} von ${t.kapazitaet} Plätzen frei`
                      )}
                    </span>
                  </p>
                  {!t.karteGueltig ? <p className="small muted">Nicht mit Credits buchbar, nur als Einzelstunde.</p> : null}
                </div>

                <div className="plan-termin-aktion">
                  {t.ausgefallen ? (
                    <p className="small plan-status">Kurs ausgefallen</p>
                  ) : istVergangen ? (
                    <p className="small plan-status">vergangen</p>
                  ) : !eingeloggt ? (
                    <Link className="go small" href={loginZiel}>
                      {istVoll ? "Login für die Warteliste" : "Login zum Buchen"}
                    </Link>
                  ) : t.meinStatus === "GEBUCHT" && t.meineBuchungId ? (
                    <Link className="go small" href={`/${t.standortSlug}/konto/buchung/${t.meineBuchungId}`}>
                      Gebucht, Details
                    </Link>
                  ) : t.meinStatus === "WARTELISTE" && istVoll ? (
                    <p className="small plan-status">Auf der Warteliste</p>
                  ) : offenesFormular === t.id ? (
                    <div className="plan-formular">
                      <BuchenForm
                        standortSlug={t.standortSlug}
                        kursTerminId={t.id}
                        preisLabel={t.preisLabel}
                        karten={t.nutzbareKarten}
                        wartelisteNoetig={istVoll}
                      />
                      <button type="button" className="btn-unstyled small muted" onClick={() => setOffenesFormular(null)}>
                        abbrechen
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-klein" onClick={() => setOffenesFormular(t.id)}>
                      {istVoll ? "Warteliste beitreten" : "Buchen"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
