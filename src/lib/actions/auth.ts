"use server";

import { redirect } from "next/navigation";
import { registriereKunde, findeKundeNachEmail } from "@/lib/repositories/kunden";
import { pruefePasswort } from "@/lib/auth/password";
import { erstelleSession, beendeSession } from "@/lib/auth/session";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type FormularFehler = ErgebnisMitText;

export async function registrierenAction(
  standortSlug: string,
  _vorher: FormularFehler | null,
  formData: FormData,
): Promise<FormularFehler | null> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim();
  const strasse = String(formData.get("strasse") ?? "").trim();
  const plz = String(formData.get("plz") ?? "").trim();
  const ort = String(formData.get("ort") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");
  const agb = formData.get("agb");
  const mindestalter = formData.get("mindestalter");

  if (!name || !email || !telefon || !strasse || !plz || !ort || !passwort) {
    return { fehler: "Bitte alle Felder ausfüllen." };
  }
  if (passwort.length < 8) {
    return { fehler: "Das Passwort muss mindestens 8 Zeichen haben." };
  }
  if (!agb) {
    return { fehler: "Bitte den AGB zustimmen, sonst ist keine Buchung möglich." };
  }
  if (!mindestalter) {
    return { fehler: "Bitte bestätigen, dass Sie mindestens 16 Jahre alt sind (ggf. mit einem Elternteil)." };
  }

  let kunde;
  try {
    kunde = await registriereKunde({ name, email, passwort, telefon, strasse, plz, ort });
  } catch (fehler) {
    return { fehler: fehler instanceof Error ? fehler.message : "Registrierung fehlgeschlagen." };
  }

  await erstelleSession(kunde.id);
  redirect(`/${standortSlug}/konto/profil`);
}

export async function loginAction(
  standortSlug: string,
  _vorher: FormularFehler | null,
  formData: FormData,
): Promise<FormularFehler | null> {
  const email = String(formData.get("email") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");

  const kunde = await findeKundeNachEmail(email);
  if (!kunde || !(await pruefePasswort(passwort, kunde.passwortHash))) {
    return { fehler: "E-Mail oder Passwort ist falsch." };
  }

  await erstelleSession(kunde.id);
  redirect(`/${standortSlug}/konto/profil`);
}

export async function logoutAction(standortSlug: string) {
  "use server";
  await beendeSession();
  redirect(`/${standortSlug}`);
}
