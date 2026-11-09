import "server-only";
import wegwerfDomains from "disposable-email-domains";

/**
 * Erkennt Wegwerf-E-Mail-Adressen (Mailinator und ähnliche Dienste) anhand der
 * gepflegten Liste im Paket "disposable-email-domains". Geprüft wird die Domain
 * und jede übergeordnete Domain, damit auch Unterdomains gefangen werden.
 */
const MENGE = new Set<string>(wegwerfDomains);

export function istWegwerfAdresse(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  const teile = domain.split(".");
  for (let i = 0; i < teile.length - 1; i++) {
    if (MENGE.has(teile.slice(i).join("."))) return true;
  }
  return false;
}
