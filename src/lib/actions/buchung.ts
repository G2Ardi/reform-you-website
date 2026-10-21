"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEingeloggterKunde } from "@/lib/auth/session";
import {
  BuchungsFehler,
  bestaetigeWartelistenPlatz,
  erstelleBuchung,
  storniereBuchung,
  umbucheBuchung,
} from "@/lib/repositories/buchungen";
import { pruefeAktionsToken } from "@/lib/auth/actionToken";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type AktionsErgebnis = ErgebnisMitText;

export async function buchenAction(
  standortSlug: string,
  _vorher: AktionsErgebnis | null,
  formData: FormData,
): Promise<AktionsErgebnis | null> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) {
    redirect(`/${standortSlug}/konto/login`);
  }

  const kursTerminId = String(formData.get("kursTerminId") ?? "");
  const zahlungsart = String(formData.get("zahlungsart") ?? "EINZELZAHLUNG") as "KARTE" | "EINZELZAHLUNG";
  const karteId = formData.get("karteId") ? String(formData.get("karteId")) : undefined;

  try {
    const buchung = await erstelleBuchung({ kundeId: kunde.id, kursTerminId, zahlungsart, karteId });
    revalidatePath(`/${standortSlug}/buchen`);
    return {
      erfolg:
        buchung.status === "WARTELISTE"
          ? "Der Termin ist voll, Sie stehen jetzt auf der Warteliste."
          : "Buchung bestätigt, Sie erhalten gleich eine E-Mail.",
    };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Buchung fehlgeschlagen." };
  }
}

export async function stornierenAction(standortSlug: string, buchungId: string): Promise<AktionsErgebnis> {
  const kunde = await getEingeloggterKunde();
  if (!kunde) redirect(`/${standortSlug}/konto/login`);

  try {
    await storniereBuchung({ buchungId, kundeId: kunde.id });
    revalidatePath(`/${standortSlug}/konto/profil`);
    return { erfolg: "Storniert." };
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
    return { erfolg: "Umgebucht." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Umbuchen fehlgeschlagen." };
  }
}

/** Token-basierte Aktionen aus E-Mail-Links, ohne Login (siehe Auftrag). */
export async function tokenStornierenAction(token: string): Promise<AktionsErgebnis> {
  const nutzlast = pruefeAktionsToken(token);
  if (!nutzlast) return { fehler: "Dieser Link ist ungültig oder abgelaufen." };
  try {
    await storniereBuchung({ buchungId: nutzlast.buchungId });
    return { erfolg: "Storniert." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Stornieren fehlgeschlagen." };
  }
}

export async function tokenUmbuchenAction(
  token: string,
  _vorher: AktionsErgebnis | null,
  formData: FormData,
): Promise<AktionsErgebnis | null> {
  const nutzlast = pruefeAktionsToken(token);
  if (!nutzlast) return { fehler: "Dieser Link ist ungültig oder abgelaufen." };
  const neuerKursTerminId = String(formData.get("neuerKursTerminId") ?? "");
  try {
    await umbucheBuchung({ buchungId: nutzlast.buchungId, neuerKursTerminId });
    return { erfolg: "Umgebucht." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Umbuchen fehlgeschlagen." };
  }
}

export async function tokenWartelisteBestaetigenAction(token: string): Promise<AktionsErgebnis> {
  const nutzlast = pruefeAktionsToken(token);
  if (!nutzlast) return { fehler: "Dieser Link ist ungültig oder abgelaufen." };
  try {
    await bestaetigeWartelistenPlatz(nutzlast.buchungId);
    return { erfolg: "Platz bestätigt." };
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Bestätigen fehlgeschlagen." };
  }
}
