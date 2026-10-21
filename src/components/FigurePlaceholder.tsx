import type { ReactNode } from "react";
import Image from "next/image";

type Ratio = "45" | "1610" | "11";

interface FigurePlaceholderProps {
  ratio: Ratio;
  hint: string;
  caption?: ReactNode;
  /**
   * Spaeter hier den echten Bildpfad eintragen, z. B. "/bilder/hero.webp".
   * Solange "src" fehlt, zeigt die Komponente die markenfarbene
   * Platzhalterflaeche mit Hinweistext, exakt reserviert in der Zielgroesse,
   * damit das Einsetzen eines echten Fotos keinen Layoutsprung verursacht
   * und keinen Code-Umbau braucht.
   */
  src?: string;
  alt?: string;
  className?: string;
}

const ratioClass: Record<Ratio, string> = {
  "45": "ratio-45",
  "1610": "ratio-1610",
  "11": "ratio-11",
};

export default function FigurePlaceholder({
  ratio,
  hint,
  caption,
  src,
  alt,
  className,
}: FigurePlaceholderProps) {
  return (
    <figure className={["figure", className].filter(Boolean).join(" ")}>
      <div
        className={[
          "figure-frame",
          ratioClass[ratio],
          src ? null : "figure-frame--platzhalter",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {src ? (
          <Image
            src={src}
            alt={alt ?? ""}
            fill
            sizes="(min-width: 62rem) 50vw, 100vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <p className="figure-hint">Foto fehlt: {hint}</p>
        )}
      </div>
      {caption ? <figcaption className="figure-cap">{caption}</figcaption> : null}
    </figure>
  );
}
