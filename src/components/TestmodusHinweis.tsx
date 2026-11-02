import { istTestmodus } from "@/lib/repositories/kasse";

/** Deutlicher Hinweis, solange keine echte Zahlungsanbindung aktiv ist. */
export default function TestmodusHinweis() {
  if (!istTestmodus()) return null;
  return (
    <p className="hinweis-test" role="note">
      <strong>Testmodus:</strong> Die Bezahlung wird nur simuliert, es wird kein Geld abgebucht.
    </p>
  );
}
