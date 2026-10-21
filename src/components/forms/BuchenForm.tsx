"use client";

import { useState } from "react";
import ActionForm from "@/components/forms/ActionForm";
import { buchenAction, type AktionsErgebnis } from "@/lib/actions/buchung";

interface KarteOption {
  id: string;
  label: string;
}

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
  const [zahlungsart, setZahlungsart] = useState<"KARTE" | "EINZELZAHLUNG">(
    karten.length > 0 ? "KARTE" : "EINZELZAHLUNG",
  );

  const action = buchenAction.bind(null, standortSlug) as (
    vorher: AktionsErgebnis | null,
    formData: FormData,
  ) => Promise<AktionsErgebnis | null>;

  return (
    <ActionForm action={action} initialState={null} submitLabel={wartelisteNoetig ? "Auf Warteliste" : "Buchen"}>
      <input type="hidden" name="kursTerminId" value={kursTerminId} />
      {karten.length > 0 ? (
        <div className="form-row">
          <label htmlFor={`zahlungsart-${kursTerminId}`}>Zahlung</label>
          <select
            className="input"
            id={`zahlungsart-${kursTerminId}`}
            name="zahlungsart"
            value={zahlungsart}
            onChange={(e) => setZahlungsart(e.target.value as "KARTE" | "EINZELZAHLUNG")}
          >
            <option value="KARTE">Mit Karte bezahlen</option>
            <option value="EINZELZAHLUNG">{`Einzelbuchung, ${preisLabel} (nur Information, keine Zahlungsanbindung)`}</option>
          </select>
        </div>
      ) : (
        <>
          <input type="hidden" name="zahlungsart" value="EINZELZAHLUNG" />
          <p className="small muted">
            Keine passende Karte, nur Information: {preisLabel}, Zahlung vor Ort bzw. laut Absprache.
          </p>
        </>
      )}
      {karten.length > 0 && zahlungsart === "KARTE" ? (
        <div className="form-row">
          <label htmlFor={`karte-${kursTerminId}`}>Karte wählen</label>
          <select className="input" id={`karte-${kursTerminId}`} name="karteId">
            {karten.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </ActionForm>
  );
}
