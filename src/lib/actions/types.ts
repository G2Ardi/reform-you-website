/**
 * Gemeinsamer Rückgabetyp für alle Server Actions, die über
 * src/components/forms/ActionForm.tsx oder ActionButton.tsx laufen: entweder
 * ein Fehlertext oder ein Erfolgstext, nie beides.
 */
export interface ErgebnisMitText {
  fehler?: string;
  erfolg?: string;
}
