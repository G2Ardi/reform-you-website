import { redirect } from "next/navigation";

/** Das frühere "Abo & Preise" heißt jetzt "Credits", alte Links bleiben gültig. */
export default async function AboWeiterleitung({
  params,
}: {
  params: Promise<{ standort: string }>;
}) {
  const { standort } = await params;
  redirect(`/${standort}/credits`);
}
