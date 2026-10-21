import "server-only";
import { prisma } from "@/lib/prisma";
import { hashePasswort } from "@/lib/auth/password";

export interface RegistrierungsDaten {
  name: string;
  email: string;
  passwort: string;
  telefon: string;
  strasse: string;
  plz: string;
  ort: string;
}

export async function findeKundeNachEmail(email: string) {
  return prisma.kunde.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function registriereKunde(daten: RegistrierungsDaten) {
  const email = daten.email.trim().toLowerCase();
  const bestehend = await findeKundeNachEmail(email);
  if (bestehend) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein Konto.");
  }

  const passwortHash = await hashePasswort(daten.passwort);

  return prisma.kunde.create({
    data: {
      name: daten.name.trim(),
      email,
      passwortHash,
      telefon: daten.telefon.trim(),
      strasse: daten.strasse.trim(),
      plz: daten.plz.trim(),
      ort: daten.ort.trim(),
      agbAkzeptiertAm: new Date(),
    },
  });
}
