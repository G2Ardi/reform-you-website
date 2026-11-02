"use client";

import ActionForm from "@/components/forms/ActionForm";
import { umbuchenAction, type AktionsErgebnis } from "@/lib/actions/buchung";

interface Option {
  id: string;
  label: string;
}

export default function UmbuchenForm({
  standortSlug,
  buchungId,
  optionen,
}: {
  standortSlug: string;
  buchungId: string;
  optionen: Option[];
}) {
  const action = umbuchenAction.bind(null, standortSlug, buchungId) as (
    vorher: AktionsErgebnis | null,
    formData: FormData,
  ) => Promise<AktionsErgebnis | null>;

  if (optionen.length === 0) {
    return <p className="small muted">Aktuell ist kein anderer Termin mit freiem Platz verfügbar.</p>;
  }

  return (
    <ActionForm action={action} initialState={null} submitLabel="Verschieben" className="form">
      <div className="form-row">
        <label htmlFor={`neu-${buchungId}`}>Neuen Kurs wählen</label>
        <select className="input" id={`neu-${buchungId}`} name="neuerKursTerminId" required>
          {optionen.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </ActionForm>
  );
}
