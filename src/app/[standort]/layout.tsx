import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import SkipLink from "@/components/SkipLink";
import { getStandortBySlug } from "@/lib/repositories/standorte";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ standort: string }>;
}): Promise<Metadata> {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);
  return {
    title: standort ? standort.name : "Standort nicht gefunden",
  };
}

export default async function StandortLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ standort: string }>;
}) {
  const { standort: slug } = await params;
  const standort = await getStandortBySlug(slug);

  if (!standort) {
    notFound();
  }

  return (
    <>
      <SkipLink />
      {children}
      <Footer
        standort={{
          slug: standort.slug,
          name: standort.name,
          strasse: standort.strasse,
          plz: standort.plz,
          ort: standort.ort,
          telefon: standort.telefon,
          email: standort.email,
        }}
      />
    </>
  );
}
