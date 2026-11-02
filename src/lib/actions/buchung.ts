"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEingeloggterKunde } from "@/lib/auth/session";
import {
  BuchungsFehler,
  erstelleBuchung,
  storniereBuchung,
  umbucheBuchung,
} from "@/lib/repositories/buchungen";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type AktionsErgebnis = ErgebnisMitText;

/**
 * Buchen mit Credits oder auf die Warteliste. Die Einzelstunde läuft über
 * den Bezahlschritt (siehe actions/kasse.ts), nicht über diese Aktion.
 */
export async function buchenAction(
  standortSlug: string,
  _vorher: AktionsErgebnis | null,
  formData: FormData,
): Promise<AktionsErgebnis | null> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) {
    redirect(`/${standortSlug}/konto/login?weiter=${encodeURIComponent(`/${standortSlug}/buchen`)}`);
  }

  const kursTerminId = String(formData.get("kursTerminId") ?? "");
  const modus = String(formData.get("modus") ?? "KARTE");
  const karteId = formData.get("karteId") ? String(formData.get("karteId")) : undefined;

  try {
    const buchung = await erstelleBuchung({
      kundeId: kunde.id,
      kursTerminId,
      zahlungsart: modus === "WARTELISTE" ? "EINZELZAHLUNG" : "KARTE",
      karteId,
    });
    revalidatePath(`/${standortSlug}/buchen`);
    return {
      erfolg:
        buchung.status === "WARTELISTE"
          ? "Du stehst auf der Warteliste. Sobald ein Platz frei wird, bekommst du eine E-Mail."
          : "Gebucht. Du bekommst gleich eine Bestätigung per E-Mail.",
    };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Buchung fehlgeschlagen." };
  }
}

export async function stornierenAction(standortSlug: string, buchungId: string): Promise<AktionsErgebnis> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standortSlug}/konto/login`);

  try {
    const { gutschrift, nachFrist } = await storniereBuchung({ buchungId, kundeId: kunde.id });
    revalidatePath(`/${standortSlug}/konto/profil`);
    revalidatePath(`/${standortSlug}/konto/buchung/${buchungId}`);
    if (!gutschrift && nachFrist) return { erfolg: "Storniert, ohne Gutschrift, weil die Stornofrist abgelaufen war." };
    return { erfolg: gutschrift ? "Storniert, die Gutschrift ist auf deinem Konto." : "Storniert." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Stornieren fehlgeschlagen." };
  }
}

export async function umbuchenAction(
  standortSlug: string,
  buchungId: string,
  _vorher: AktionsErgebnis | null,
  formData: FormData,
): Promise<AktionsErgebnis | null> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standortSlug}/konto/login`);

  const neuerKursTerminId = String(formData.get("neuerKursTerminId") ?? "");
  try {
    await umbucheBuchung({ buchungId, kundeId: kunde.id, neuerKursTerminId });
    revalidatePath(`/${standortSlug}/konto/profil`);
    revalidatePath(`/${standortSlug}/konto/buchung/${buchungId}`);
    return { erfolg: "Verschoben. Du bekommst eine neue Bestätigung per E-Mail." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Verschieben fehlgeschlagen." };
  }
}
