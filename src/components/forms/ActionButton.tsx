"use client";

import { useState, useTransition } from "react";

interface ActionButtonProps {
  action: () => Promise<{ fehler?: string; erfolg?: string }>;
  label: string;
  bestaetigung?: string;
  className?: string;
}

/**
 * Button für parameterlose (oder bereits per closure gebundene) Server
 * Actions ohne eigenes Formular: "Jetzt ausgefallen setzen", "No-Show
 * markieren", "Erinnerungen jetzt versenden" usw. Zeigt das Ergebnis
 * direkt unter dem Button an.
 */
export default function ActionButton({ action, label, bestaetigung, className }: ActionButtonProps) {
  const [ergebnis, setErgebnis] = useState<{ fehler?: string; erfolg?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        className={className ?? "btn btn-line"}
        type="button"
        disabled={pending}
        onClick={() => {
          if (bestaetigung && !window.confirm(bestaetigung)) return;
          startTransition(async () => {
            const res = await action();
            setErgebnis(res);
          });
        }}
      >
        {pending ? "einen Moment…" : label}
      </button>
      {ergebnis?.fehler ? <p className="form-fehler" style={{ marginTop: "0.5em" }}>{ergebnis.fehler}</p> : null}
      {ergebnis?.erfolg ? <p className="form-erfolg" style={{ marginTop: "0.5em" }}>{ergebnis.erfolg}</p> : null}
    </div>
  );
}
