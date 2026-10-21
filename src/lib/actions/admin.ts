"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { istAdminEingeloggt, loescheAdminCookie, pruefeAdminPasswort, setzeAdminCookie } from "@/lib/auth/admin";
import { updateEinstellungen } from "@/lib/repositories/einstellungen";
import { versendeFaelligeErinnerungen, lasseKursAusfallen, markiereNoShow, storniereBuchung } from "@/lib/repositories/buchungen";
import { erstelleKulanzGuthaben, kaufeKarte } from "@/lib/repositories/karten";
import { findeKundeNachEmail } from "@/lib/repositories/kunden";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type AdminErgebnis = ErgebnisMitText;

export async function adminLoginAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  const passwort = String(formData.get("passwort") ?? "");
  if (!pruefeAdminPasswort(passwort)) {
    return { fehler: "Passwort ist falsch, oder ADMIN_PASSWORT ist nicht gesetzt." };
  }
  await setzeAdminCookie();
  redirect("/admin");
}

export async function adminLogoutAction() {
  "use server";
  await loescheAdminCookie();
  redirect("/admin/login");
}

async function adminPruefen() {
  if (!(await istAdminEingeloggt())) {
    redirect("/admin/login");
  }
}

export async function einstellungenSpeichernAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await adminPruefen();
  const erinnerung = Number(formData.get("erinnerungStundenVorher"));
  const storno = Number(formData.get("stornoFristStunden"));
  if (!Number.isFinite(erinnerung) || erinnerung <= 0 || !Number.isFinite(storno) || storno <= 0) {
    return { fehler: "Bitte positive Zahlen eingeben." };
  }
  await updateEinstellungen({ erinnerungStundenVorher: erinnerung, stornoFristStunden: storno });
  revalidatePath("/admin/einstellungen");
  return { erfolg: "Gespeichert." };
}

export async function erinnerungenVersendenAction(): Promise<AdminErgebnis> {
  await adminPruefen();
  const { versandt, geprueft } = await versendeFaelligeErinnerungen();
  revalidatePath("/admin/erinnerungen");
  return { erfolg: `${versandt} von ${geprueft} fälligen Erinnerungen versendet.` };
}

export async function kursAusfallenLassenAction(kursTerminId: string): Promise<AdminErgebnis> {
  await adminPruefen();
  const { gutgeschrieben } = await lasseKursAusfallen(kursTerminId);
  revalidatePath("/admin");
  return { erfolg: `Kurs ausgefallen gesetzt, ${gutgeschrieben} Gutschrift(en) erstellt.` };
}

export async function noShowMarkierenAction(buchungId: string): Promise<AdminErgebnis> {
  await adminPruefen();
  await markiereNoShow(buchungId);
  revalidatePath("/admin");
  return { erfolg: "Als No-Show markiert." };
}

export async function adminStornierenAction(buchungId: string): Promise<AdminErgebnis> {
  await adminPruefen();
  await storniereBuchung({ buchungId, erzwingenDurchAdmin: true, grund: "Kulanz, durch Admin storniert" });
  revalidatePath("/admin");
  return { erfolg: "Storniert, mit Gutschrift." };
}

export async function kulanzAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await adminPruefen();
  const email = String(formData.get("email") ?? "").trim();
  const aktion = String(formData.get("aktion") ?? "");
  const notiz = String(formData.get("notiz") ?? "").trim();

  const kunde = await findeKundeNachEmail(email);
  if (!kunde) return { fehler: "Kein Kunde mit dieser E-Mail-Adresse gefunden." };

  if (aktion === "guthaben-1") {
    await erstelleKulanzGuthaben(kunde.id, 1, notiz || "Kulanz-Gutschrift, 1 Einheit");
  } else if (aktion === "guthaben-5") {
    await erstelleKulanzGuthaben(kunde.id, 5, notiz || "Kulanz-Gutschrift, 5 Einheiten");
  } else if (aktion === "karte-5er") {
    await kaufeKarte(kunde.id, "FUENFER", notiz || "Kulanz, 5er-Karte gutgeschrieben");
  } else if (aktion === "karte-10er") {
    await kaufeKarte(kunde.id, "ZEHNER", notiz || "Kulanz, 10er-Karte gutgeschrieben");
  } else {
    return { fehler: "Unbekannte Aktion." };
  }

  revalidatePath("/admin/kulanz");
  return { erfolg: `Kulanz-Aktion für ${email} ausgeführt.` };
}
