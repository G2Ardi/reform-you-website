"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  beendeMitarbeiterSession,
  erstelleMitarbeiterSession,
  erzwingeAdmin,
  erzwingePersonal,
  erzwingeUmsatzRecht,
} from "@/lib/auth/admin";
import { updateEinstellungen } from "@/lib/repositories/einstellungen";
import {
  BuchungsFehler,
  lasseKursAusfallen,
  markiereAnwesend,
  markiereNoShow,
  storniereBuchung,
  versendeFaelligeErinnerungen,
} from "@/lib/repositories/buchungen";
import { erstelleKulanzGuthaben, kaufeKarte } from "@/lib/repositories/karten";
import { findeKundeNachEmail } from "@/lib/repositories/kunden";
import { versendeFaelligeGutscheine } from "@/lib/repositories/gutscheine";
import {
  MitarbeiterFehler,
  aktualisiereMitarbeiter,
  erstelleMitarbeiter,
  pruefeMitarbeiterLogin,
} from "@/lib/repositories/mitarbeiter";
import type { ErgebnisMitText } from "@/lib/actions/types";

export type AdminErgebnis = ErgebnisMitText;

export async function adminLoginAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  const email = String(formData.get("email") ?? "");
  const passwort = String(formData.get("passwort") ?? "");
  const mitarbeiter = await pruefeMitarbeiterLogin(email, passwort);
  if (!mitarbeiter) {
    return { fehler: "E-Mail oder Passwort ist falsch." };
  }
  await erstelleMitarbeiterSession(mitarbeiter.id);
  redirect("/admin");
}

export async function adminLogoutAction() {
  "use server";
  await beendeMitarbeiterSession();
  redirect("/admin/login");
}

export async function einstellungenSpeichernAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await erzwingeAdmin();
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
  await erzwingeAdmin();
  const { versandt, geprueft } = await versendeFaelligeErinnerungen();
  const gutscheine = await versendeFaelligeGutscheine();
  revalidatePath("/admin/erinnerungen");
  return {
    erfolg: `${versandt} von ${geprueft} fälligen Erinnerungen und ${gutscheine.versandt} fällige Gutscheine versendet.`,
  };
}

export async function kursAusfallenLassenAction(kursTerminId: string): Promise<AdminErgebnis> {
  await erzwingeAdmin();
  const { gutgeschrieben } = await lasseKursAusfallen(kursTerminId);
  revalidatePath("/admin");
  return { erfolg: `Kurs ausgefallen gesetzt, ${gutgeschrieben} Gutschrift(en) erstellt.` };
}

/** Auch Trainer dürfen Teilnehmer als nicht erschienen markieren. */
export async function noShowMarkierenAction(buchungId: string): Promise<AdminErgebnis> {
  await erzwingePersonal();
  try {
    await markiereNoShow(buchungId);
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Markieren fehlgeschlagen." };
  }
  revalidatePath("/admin");
  return { erfolg: "Als No-Show markiert." };
}

/** Auch Trainer dürfen Teilnehmer als anwesend markieren. */
export async function anwesendMarkierenAction(buchungId: string): Promise<AdminErgebnis> {
  await erzwingePersonal();
  try {
    await markiereAnwesend(buchungId);
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Markieren fehlgeschlagen." };
  }
  revalidatePath("/admin");
  return { erfolg: "Als anwesend markiert." };
}

export async function adminStornierenAction(buchungId: string): Promise<AdminErgebnis> {
  await erzwingeAdmin();
  try {
    await storniereBuchung({ buchungId, erzwingenDurchAdmin: true, grund: "Kulanz, durch Admin storniert" });
  } catch (fehler) {
    return { fehler: fehler instanceof BuchungsFehler ? fehler.message : "Stornieren fehlgeschlagen." };
  }
  revalidatePath("/admin");
  return { erfolg: "Storniert, mit Gutschrift." };
}

export async function kulanzAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await erzwingeAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const aktion = String(formData.get("aktion") ?? "");
  const notiz = String(formData.get("notiz") ?? "").trim();

  const kunde = await findeKundeNachEmail(email);
  if (!kunde) return { fehler: "Kein Kunde mit dieser E-Mail-Adresse gefunden." };

  if (aktion === "guthaben-1") {
    await erstelleKulanzGuthaben(kunde.id, 1, notiz || "Kulanz-Gutschrift, 1 Credit");
  } else if (aktion === "guthaben-5") {
    await erstelleKulanzGuthaben(kunde.id, 5, notiz || "Kulanz-Gutschrift, 5 Credits");
  } else if (aktion === "karte-5er") {
    await kaufeKarte(kunde.id, "FUENFER", notiz || "Kulanz, 5 Credits gutgeschrieben");
  } else if (aktion === "karte-10er") {
    await kaufeKarte(kunde.id, "ZEHNER", notiz || "Kulanz, 10 Credits gutgeschrieben");
  } else {
    return { fehler: "Unbekannte Aktion." };
  }

  revalidatePath("/admin/kulanz");
  return { erfolg: `Kulanz-Aktion für ${email} ausgeführt.` };
}

export async function mitarbeiterAnlegenAction(
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await erzwingeUmsatzRecht();
  const rolle = String(formData.get("rolle") ?? "TRAINER") === "ADMIN" ? "ADMIN" : "TRAINER";
  try {
    await erstelleMitarbeiter({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      passwort: String(formData.get("passwort") ?? ""),
      rolle,
      darfUmsaetzeSehen: formData.get("darfUmsaetzeSehen") === "on",
    });
  } catch (fehler) {
    return { fehler: fehler instanceof MitarbeiterFehler ? fehler.message : "Anlegen fehlgeschlagen." };
  }
  revalidatePath("/admin/mitarbeiter");
  return { erfolg: "Zugang angelegt." };
}

export async function mitarbeiterAendernAction(
  id: string,
  daten: { aktiv?: boolean; rolle?: "ADMIN" | "TRAINER"; darfUmsaetzeSehen?: boolean },
): Promise<AdminErgebnis> {
  await erzwingeUmsatzRecht();
  try {
    await aktualisiereMitarbeiter(id, daten);
  } catch (fehler) {
    return { fehler: fehler instanceof MitarbeiterFehler ? fehler.message : "Ändern fehlgeschlagen." };
  }
  revalidatePath("/admin/mitarbeiter");
  return { erfolg: "Gespeichert." };
}

export async function mitarbeiterPasswortAction(
  id: string,
  _vorher: AdminErgebnis | null,
  formData: FormData,
): Promise<AdminErgebnis | null> {
  await erzwingeUmsatzRecht();
  const passwort = String(formData.get("passwort") ?? "");
  if (!passwort) return { fehler: "Bitte ein neues Passwort eingeben." };
  try {
    await aktualisiereMitarbeiter(id, { passwort });
  } catch (fehler) {
    return { fehler: fehler instanceof MitarbeiterFehler ? fehler.message : "Ändern fehlgeschlagen." };
  }
  return { erfolg: "Passwort geändert." };
}
