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
    return <p className="small muted">Aktuell kein anderer Termin dieses Kurses verfügbar.</p>;
  }

  return (
    <ActionForm action={action} initialState={null} submitLabel="Umbuchen" className="form-row-inline">
      <select className="input" name="neuerKursTerminId" required style={{ maxWidth: "20rem" }}>
        {optionen.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </ActionForm>
  );
}
