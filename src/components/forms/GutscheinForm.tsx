"use client";

import { useState } from "react";
import ActionForm from "@/components/forms/ActionForm";
import { gutscheinBestellenAction, type KasseErgebnis } from "@/lib/actions/kasse";
import { GUTSCHEIN_BETRAEGE_EURO, GUTSCHEIN_MAX_EURO, GUTSCHEIN_MIN_EURO } from "@/lib/credits";

export default function GutscheinForm({
  standortSlug,
  vorbelegtName,
  vorbelegtEmail,
  heute,
}: {
  standortSlug: string;
  vorbelegtName: string;
  vorbelegtEmail: string;
  /** JJJJ-MM-TT, frühestes Lieferdatum */
  heute: string;
}) {
  const [betrag, setBetrag] = useState<string>("50");

  const action = gutscheinBestellenAction.bind(null, standortSlug) as (
    vorher: KasseErgebnis | null,
    formData: FormData,
  ) => Promise<KasseErgebnis | null>;

  return (
    <ActionForm action={action} initialState={null} submitLabel="Zahlungspflichtig bestellen">
      <fieldset className="gutschein-betraege">
        <legend>Betrag</legend>
        <div className="gutschein-betraege-reihe">
          {GUTSCHEIN_BETRAEGE_EURO.map((euro) => (
            <label key={euro} className={`gutschein-betrag${betrag === String(euro) ? " gutschein-betrag-aktiv" : ""}`}>
              <input
                type="radio"
                name="betrag"
                value={euro}
                checked={betrag === String(euro)}
                onChange={() => setBetrag(String(euro))}
              />
              <span>{euro} €</span>
            </label>
          ))}
          <label className={`gutschein-betrag${betrag === "frei" ? " gutschein-betrag-aktiv" : ""}`}>
            <input type="radio" name="betrag" value="frei" checked={betrag === "frei"} onChange={() => setBetrag("frei")} />
            <span>anderer Betrag</span>
          </label>
        </div>
        {betrag === "frei" ? (
          <div className="form-row">
            <label htmlFor="betragFrei">Betrag in Euro ({GUTSCHEIN_MIN_EURO} bis {GUTSCHEIN_MAX_EURO})</label>
            <input
              className="input"
              id="betragFrei"
              name="betragFrei"
              type="number"
              inputMode="numeric"
              min={GUTSCHEIN_MIN_EURO}
              max={GUTSCHEIN_MAX_EURO}
              step={1}
              required
            />
          </div>
        ) : null}
      </fieldset>

      <div className="form-cols-2">
        <div className="form-row">
          <label htmlFor="empfaengerName">Name des Empfängers</label>
          <input className="input" id="empfaengerName" name="empfaengerName" required autoComplete="off" />
        </div>
        <div className="form-row">
          <label htmlFor="empfaengerEmail">E-Mail des Empfängers</label>
          <input className="input" id="empfaengerEmail" name="empfaengerEmail" type="email" required autoComplete="off" />
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="lieferDatum">Lieferdatum, an dem der Code per E-Mail ankommt</label>
        <input className="input" id="lieferDatum" name="lieferDatum" type="date" min={heute} defaultValue={heute} required />
      </div>

      <div className="form-row">
        <label htmlFor="nachricht">Nachricht (optional)</label>
        <textarea className="input" id="nachricht" name="nachricht" rows={3} maxLength={500} />
      </div>

      <div className="form-cols-2">
        <div className="form-row">
          <label htmlFor="kaeuferName">Dein Name</label>
          <input className="input" id="kaeuferName" name="kaeuferName" defaultValue={vorbelegtName} required />
        </div>
        <div className="form-row">
          <label htmlFor="kaeuferEmail">Deine E-Mail, für die Bestätigung</label>
          <input
            className="input"
            id="kaeuferEmail"
            name="kaeuferEmail"
            type="email"
            defaultValue={vorbelegtEmail}
            required
          />
        </div>
      </div>
    </ActionForm>
  );
}
