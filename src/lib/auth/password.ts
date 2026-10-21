import "server-only";
import bcrypt from "bcryptjs";

/**
 * Passwort-Hashing ausschließlich über bcryptjs (reines JavaScript), NICHT
 * über "bcrypt": das native Modul braucht einen C++-Compiler/node-gyp, der
 * auf dieser Windows-Entwicklungsmaschine nicht sicher vorhanden ist.
 */

export async function hashePasswort(klartext: string): Promise<string> {
  return bcrypt.hash(klartext, 10);
}

export async function pruefePasswort(klartext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(klartext, hash);
}
