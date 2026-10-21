"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ErgebnisMitText } from "@/lib/actions/types";

interface ActionFormProps {
  action: (vorher: ErgebnisMitText | null, formData: FormData) => Promise<ErgebnisMitText | null>;
  initialState: ErgebnisMitText | null;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}

/**
 * Schlanker Wrapper um useActionState: zeigt Fehler- oder Erfolgstext aus
 * dem Server-Action-Ergebnis an, ohne dass jede Seite das selbst
 * verdrahten muss. Genutzt von Registrierung, Login, Buchen, Umbuchen,
 * Admin-Einstellungen, Admin-Kulanz.
 */
export default function ActionForm({ action, initialState, submitLabel, children, className }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className ?? "form"}>
      {children}
      {state?.fehler ? <p className="form-fehler">{state.fehler}</p> : null}
      {state?.erfolg ? <p className="form-erfolg">{state.erfolg}</p> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "einen Moment…" : submitLabel}
      </button>
    </form>
  );
}
