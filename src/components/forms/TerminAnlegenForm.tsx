"use client";

import { useState } from "react";
import ActionForm from "@/components/forms/ActionForm";
import { termineAnlegenAction } from "@/lib/actions/admin";

interface Kurs {
  id: string;
  name: string;
  dauerMinuten: number;
  plaetze: number;
}
interface Standort {
  id: string;
  name: string;
  kurse: Kurs[];
}

/**
 * Formular zum Anlegen von Kursterminen. Die Kursliste folgt dem gewählten
 * Standort (jeder Standort hat eigene Kurse). Wiederholung: nur einmal oder
 * jede Woche am selben Wochentag und zur selben Uhrzeit bis zu einem Enddatum.
 */
export default function TerminAnlegenForm({ standorte, heute }: { standorte: Standort[]; heute: string }) {
  const [standortId, setStandortId] = useState(standorte[0]?.id ?? "");
  const kurse = standorte.find((s) => s.id === standortId)?.kurse ?? [];
  const [kursId, setKursId] = useState(kurse[0]?.id ?? "");
  const [wiederholen, setWiederholen] = useState(false);

  const gewaehlterKurs = kurse.find((k) => k.id === kursId) ?? kurse[0];

  return (
    <ActionForm action={termineAnlegenAction} initialState={null} submitLabel="Termin anlegen">
      <div className="form-cols-2">
        <div className="form-row">
          <label htmlFor="t-standort">Standort</label>
          <select
            className="input"
            id="t-standort"
            value={standortId}
            onChange={(e) => {
              setStandortId(e.target.value);
              setKursId(standorte.find((s) => s.id === e.target.value)?.kurse[0]?.id ?? "");
            }}
          >
            {standorte.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="t-kurs">Kurs</label>
          <select className="input" id="t-kurs" name="kursId" value={gewaehlterKurs?.id ?? ""} onChange={(e) => setKursId(e.target.value)} required>
            {kurse.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-cols-2">
        <div className="form-row">
          <label htmlFor="t-datum">Datum</label>
          <input className="input" id="t-datum" name="datum" type="date" min={heute} required />
        </div>
        <div className="form-row">
          <label htmlFor="t-zeit">Uhrzeit, Beginn</label>
          <input className="input" id="t-zeit" name="zeit" type="time" step={300} required />
        </div>
      </div>

      <div className="form-cols-2">
        <div className="form-row">
          <label htmlFor="t-plaetze">Plätze (leer = {gewaehlterKurs?.plaetze ?? 6})</label>
          <input className="input" id="t-plaetze" name="plaetze" type="number" min={1} max={30} />
        </div>
        <div className="form-row">
          <label htmlFor="t-dauer">Dauer in Minuten (leer = {gewaehlterKurs?.dauerMinuten ?? 50})</label>
          <input className="input" id="t-dauer" name="dauerMinuten" type="number" min={10} max={240} />
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="t-trainer">Trainerin (optional)</label>
        <input className="input" id="t-trainer" name="trainerName" autoComplete="off" />
      </div>

      <fieldset className="plan-wahl">
        <legend className="small muted">Wiederholung</legend>
        <label className="plan-wahl-zeile">
          <input type="radio" name="wiederholung" checked={!wiederholen} onChange={() => setWiederholen(false)} />
          <span>Nur dieser Termin</span>
        </label>
        <label className="plan-wahl-zeile">
          <input type="radio" name="wiederholung" checked={wiederholen} onChange={() => setWiederholen(true)} />
          <span>Jede Woche am selben Wochentag, bis zum Datum</span>
        </label>
      </fieldset>
      {wiederholen ? (
        <div className="form-row">
          <label htmlFor="t-bis">Letzter Termin am</label>
          <input className="input" id="t-bis" name="wiederholenBis" type="date" min={heute} required />
        </div>
      ) : null}
    </ActionForm>
  );
}
