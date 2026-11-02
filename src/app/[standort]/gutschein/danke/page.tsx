import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getStandortBySlug } from "@/lib/repositories/standorte";
import { formatPreis } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GutscheinDankePage({
  params,
  searchParams,
}: {
  params: Promise<{ standort: string }>;
  searchParams: Promise<{ betrag?: string; an?: string; am?: string }>;
}) {
  const { standort: slug } = await params;
  const { betrag, an, am } = await searchParams;
  const standort = await getStandortBySlug(slug);
  if (!standort) notFound();

  const cent = Number(betrag);
  const datum = am && /^\d{4}-\d{2}-\d{2}$/.test(am) ? am.split("-").reverse().join(".") : null;

  return (
    <>
      <Header standort={{ slug: standort.slug, name: standort.name }} solid />
      <main id="inhalt">
        <section className="band band-tight">
          <div className="shell stack-3" style={{ maxWidth: "36rem" }}>
            <p className="tag">Gutschein</p>
            <h1 className="t-1">vielen dank</h1>
            <p className="lede">
              {Number.isFinite(cent) && cent > 0 ? `Dein Gutschein über ${formatPreis(cent)} ist bestellt. ` : "Dein Gutschein ist bestellt. "}
              {an ? `Der Code geht ${datum ? `am ${datum} ` : ""}per E-Mail an ${an}. ` : ""}
              Eine Bestätigung schicken wir dir per E-Mail.
            </p>
            <div className="btns">
              <Link className="btn" href={`/${standort.slug}`}>
                Zur Startseite
              </Link>
              <Link className="btn btn-line" href={`/${standort.slug}/gutschein`}>
                Noch einen Gutschein
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
