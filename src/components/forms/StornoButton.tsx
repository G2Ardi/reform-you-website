"use client";

import ActionButton from "@/components/forms/ActionButton";
import { stornierenAction } from "@/lib/actions/buchung";

export default function StornoButton({ standortSlug, buchungId }: { standortSlug: string; buchungId: string }) {
  return (
    <ActionButton
      label="Stornieren"
      bestaetigung="Diese Buchung wirklich stornieren?"
      action={() => stornierenAction(standortSlug, buchungId)}
    />
  );
}
