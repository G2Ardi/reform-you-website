import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Einfache Cookie-Session ohne externe Auth-Library: ein zufaelliges Token
 * im httpOnly-Cookie, serverseitig gegen die Session-Tabelle geprueft. Kein
 * JWT, kein Drittanbieter, bewusst so schlicht wie im Auftrag beschrieben.
 */

export const SESSION_COOKIE = "ry_session";
const SESSION_DAUER_TAGE = 30;

export async function erstelleSession(kundeId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const ablaufDatum = new Date();
  ablaufDatum.setDate(ablaufDatum.getDate() + SESSION_DAUER_TAGE);

  await prisma.session.create({
    data: { token, kundeId, ablaufDatum },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: ablaufDatum,
  });

  return token;
}

export async function beendeSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Mit React "cache" umschlossen, damit mehrere Server-Komponenten im
 * selben Request nicht mehrfach gegen die Datenbank pruefen.
 */
export const getEingeloggterKunde = cache(async function getEingeloggterKunde() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { kunde: true },
  });

  if (!session) return null;
  if (session.ablaufDatum < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.kunde;
});
