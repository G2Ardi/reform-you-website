/**
 * Vereinheitlicht eine Telefonnummer, damit "0170 1234567", "+49 170 1234567"
 * und "0049 (0)170 1234567" als dieselbe Nummer erkannt werden: nur Ziffern,
 * ohne Landesvorwahl und ohne führende Null.
 */
export function normalisiereTelefon(eingabe: string): string {
  let ziffern = eingabe.replace(/\D/g, "");
  if (ziffern.startsWith("0049")) ziffern = ziffern.slice(4);
  else if (ziffern.startsWith("49") && ziffern.length >= 11) ziffern = ziffern.slice(2);
  return ziffern.replace(/^0+/, "");
}
