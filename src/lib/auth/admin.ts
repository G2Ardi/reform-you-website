import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Login für den Admin-Bereich mit eigenem Konto je Person (E-Mail und
 * Passwort), Cookie-Session wie beim Kundenkonto, aber in eigener Tabelle.
 *
 * Rollen:
 * - ADMIN mit darfUmsaetzeSehen: Inhaberin, sieht alles und verwaltet Mitarbeiter.
 * - ADMIN ohne darfUmsaetzeSehen: verwaltet Kurse und Buchungen, keine Umsätze.
 * - TRAINER: sieht Kursplan und Teilnehmerliste, markiert anwesend oder No-Show.
 */

export const STAFF_COOKIE = "ry_staff";
const SESSION_STUNDEN = 12;

export async function erstelleMitarbeiterSession(mitarbeiterId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const ablaufDatum = new Date(Date.now() + SESSION_STUNDEN * 60 * 60 * 1000);
  await prisma.mitarbeiterSession.create({ data: { token, mitarbeiterId, ablaufDatum } });

  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: ablaufDatum,
  });
}

export async function beendeMitarbeiterSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE)?.value;
  if (token) await prisma.mitarbeiterSession.deleteMany({ where: { token } }).catch(() => {});
  cookieStore.delete(STAFF_COOKIE);
}

export const getMitarbeiter = cache(async function getMitarbeiter() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.mitarbeiterSession.findUnique({
    where: { token },
    include: { mitarbeiter: true },
  });
  if (!session) return null;
  if (session.ablaufDatum < new Date() || !session.mitarbeiter.aktiv) {
    await prisma.mitarbeiterSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.mitarbeiter;
});

type Mitarbeiter = NonNullable<Awaited<ReturnType<typeof getMitarbeiter>>>;

/** Admin oder Trainer, sonst Login. */
export async function erzwingePersonal(): Promise<Mitarbeiter> {
  const m = await getMitarbeiter();
  if (!m) redirect("/admin/login");
  return m;
}

/** Nur Admins, Trainer landen auf der Terminübersicht. */
export async function erzwingeAdmin(): Promise<Mitarbeiter> {
  const m = await erzwingePersonal();
  if (m.rolle !== "ADMIN") redirect("/admin");
  return m;
}

/** Nur Admins mit Umsatzrecht (Inhaberin). */
export async function erzwingeUmsatzRecht(): Promise<Mitarbeiter> {
  const m = await erzwingeAdmin();
  if (!m.darfUmsaetzeSehen) redirect("/admin");
  return m;
}
