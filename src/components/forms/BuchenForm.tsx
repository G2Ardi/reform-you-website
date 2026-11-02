"use client";

import { useState } from "react";
import Link from "next/link";
import ActionForm from "@/components/forms/ActionForm";
import { buchenAction, type AktionsErgebnis } from "@/lib/actions/buchung";

interface KarteOption {
  id: string;
  label: string;
}

/**
 * Buchungsformular unter einem Termin:
 * - Termin voll: nur "Warteliste beitreten", es wird nichts abgebucht.
 * - Termin frei: Wahl zwischen Credits (sofort gebucht) und Einzelstunde
 *   (weiter zum Bezahlschritt).
 */
export default function BuchenForm({
  standortSlug,
  kursTerminId,
  preisLabel,
  karten,
  wartelisteNoetig,
}: {
  standortSlug: string;
  kursTerminId: string;
  preisLabel: string;
  karten: KarteOption[];
  wartelisteNoetig: boolean;
}) {
  const [art, setArt] = useState<"credits" | "einzel">(karten.length > 0 ? "credits" : "einzel");

  const action = buchenAction.bind(null, standortSlug) as (
    vorher: AktionsErgebnis | null,
    formData: FormData,
  ) => Promise<AktionsErgebnis | null>;

  if (wartelisteNoetig) {
    return (
      <ActionForm action={action} initialState={null} submitLabel="Warteliste beitreten">
        <input type="hidden" name="kursTerminId" value={kursTerminId} />
        <input type="hidden" name="modus" value="WARTELISTE" />
        <p className="small muted">
          Der Kurs ist voll. Du bekommst eine E-Mail, sobald ein Platz frei wird. Es wird nichts abgebucht.
        </p>
      </ActionForm>
    );
  }

  return (
    <div className="plan-buchen">
      <fieldset className="plan-wahl">
        <legend className="small muted">Bezahlen mit</legend>
        {karten.length > 0 ? (
          <label className="plan-wahl-zeile">
            <input type="radio" name={`art-${kursTerminId}`} checked={art === "credits"} onChange={() => setArt("credits")} />
            <span>Credits</span>
          </label>
        ) : null}
        <label className="plan-wahl-zeile">
          <input type="radio" name={`art-${kursTerminId}`} checked={art === "einzel"} onChange={() => setArt("einzel")} />
          <span>Einzelstunde, {preisLabel}</span>
        </label>
      </fieldset>

      {art === "credits" && karten.length > 0 ? (
        <ActionForm action={action} initialState={null} submitLabel="Mit 1 Credit buchen">
          <input type="hidden" name="kursTerminId" value={kursTerminId} />
          <input type="hidden" name="modus" value="KARTE" />
          <div className="form-row">
            <label htmlFor={`karte-${kursTerminId}`}>Credits wählen</label>
            <select className="input" id={`karte-${kursTerminId}`} name="karteId">
              {karten.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </ActionForm>
      ) : (
        <Link className="btn" href={`/${standortSlug}/kasse?art=einzel&termin=${kursTerminId}`}>
          Weiter zur Zahlung
        </Link>
      )}

      {karten.length === 0 ? (
        <p className="small muted">
          Keine Credits vorhanden. <Link className="go" href={`/${standortSlug}/credits`}>Credits kaufen</Link>
        </p>
      ) : null}
    </div>
  );
}
