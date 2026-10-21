import type { ReactNode } from "react";

/**
 * Sichtbare Markierung fuer fehlende Angaben. Bewusst auffaellig
 * (Markenfarbe --flag), damit eine offene Information nicht versehentlich
 * als fertiger Inhalt durchgeht.
 */
export default function Flag({ children }: { children: ReactNode }) {
  return <span className="flag">{children}</span>;
}
