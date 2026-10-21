import Image from "next/image";

interface HeroImageProps {
  /** Spaeter hier den echten Pfad eintragen, z. B. "/bilder/hero-wassenberg.webp" */
  src?: string;
  alt?: string;
}

/**
 * Vollflaechiges Hero-Bild. Ohne "src" bleibt die markenfarbene Flaeche aus
 * .hero (background: var(--espresso)) stehen und der Hinweis-Marker
 * darunter zeigt, welches Foto fehlt. Sobald ein echtes Bild eingesetzt
 * wird, reicht die "src"-Prop, kein Layout-Code aendert sich.
 */
export default function HeroImage({ src, alt }: HeroImageProps) {
  if (!src) return null;
  return (
    <div className="hero-img-frame">
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "50% 38%" }}
      />
    </div>
  );
}
