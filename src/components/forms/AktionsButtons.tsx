"use client";

import ActionButton from "@/components/forms/ActionButton";
import ActionForm from "@/components/forms/ActionForm";
import {
  tokenStornierenAction,
  tokenUmbuchenAction,
  tokenWartelisteBestaetigenAction,
  type AktionsErgebnis,
} from "@/lib/actions/buchung";
import type { AktionsTyp } from "@/lib/auth/actionToken";

export default function AktionsButtons({
  token,
  aktion,
  umbuchOptionen,
}: {
  token: string;
  aktion: AktionsTyp;
  umbuchOptionen: { id: string; label: string }[];
}) {
  if (aktion === "storno") {
    return (
      <ActionButton
        label="Buchung stornieren"
        bestaetigung="Diese Buchung wirklich stornieren?"
        action={() => tokenStornierenAction(token)}
      />
    );
  }

  if (aktion === "warteliste-bestaetigen") {
    return (
      <ActionButton
        label="Platz bestätigen"
        action={() => tokenWartelisteBestaetigenAction(token)}
      />
    );
  }

  // aktion === "umbuchen"
  const action = tokenUmbuchenAction.bind(null, token) as (
    vorher: AktionsErgebnis | null,
    formData: FormData,
  ) => Promise<AktionsErgebnis | null>;

  if (umbuchOptionen.length === 0) {
    return <p className="muted">Aktuell kein anderer Termin dieses Kurses verfügbar.</p>;
  }

  return (
    <ActionForm action={action} initialState={null} submitLabel="Umbuchen">
      <div className="form-row">
        <label htmlFor="neuerKursTerminId">Neuer Termin</label>
        <select className="input" id="neuerKursTerminId" name="neuerKursTerminId" required>
          {umbuchOptionen.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </ActionForm>
  );
}
