export function formatPreis(cent: number | null): string {
  if (cent === null) return "offen";
  return (cent / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatDatumUhrzeit(datum: Date): string {
  return datum.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDatumLang(datum: Date | null): { tag: string; monatJahr: string } | null {
  if (!datum) return null;
  const tag = datum.toLocaleDateString("de-DE", { day: "2-digit" });
  const monatJahr = datum.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return { tag, monatJahr };
}
