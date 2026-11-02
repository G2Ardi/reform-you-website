"use client";

import ActionButton from "@/components/forms/ActionButton";
import { stornierenAction } from "@/lib/actions/buchung";

/**
 * Stornieren geht immer, auch nach Ablauf der Stornofrist. Nach der Frist
 * gibt es aber keine Gutschrift, deshalb fragt der Knopf dann deutlich nach.
 */
export default function StornoButton({
  standortSlug,
  buchungId,
  nachFrist = false,
  warteliste = false,
}: {
  standortSlug: string;
  buchungId: string;
  nachFrist?: boolean;
  warteliste?: boolean;
}) {
  const bestaetigung = warteliste
    ? "Von der Warteliste austragen?"
    : nachFrist
      ? "Die Stornofrist ist abgelaufen. Wenn du jetzt stornierst, bekommst du keine Gutschrift. Der Platz wird für die Warteliste frei. Wirklich stornieren?"
      : "Diese Buchung wirklich stornieren? Du bekommst deine Gutschrift zurück.";

  return (
    <ActionButton
      label={warteliste ? "Von Warteliste austragen" : nachFrist ? "Stornieren, ohne Gutschrift" : "Stornieren"}
      bestaetigung={bestaetigung}
      action={() => stornierenAction(standortSlug, buchungId)}
    />
  );
}
