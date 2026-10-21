import Link from "next/link";

interface FooterProps {
  standort: {
    slug: string;
    name: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    telefon: string | null;
    email: string | null;
  };
  bookingUrl?: string;
}

export default function Footer({ standort, bookingUrl }: FooterProps) {
  const basis = `/${standort.slug}`;
  const effektiveBookingUrl = bookingUrl ?? `${basis}/buchen`;
  const hatAdresse = standort.strasse && standort.plz && standort.ort;

  return (
    <footer className="foot">
      <div className="shell">
        <div className="foot-grid">
          <div>
            <h2 className="foot-h">Studio {standort.name}</h2>
            {hatAdresse ? (
              <p>
                Reform You Pilates Studio
                <br />
                {standort.strasse}
                <br />
                {standort.plz} {standort.ort}
              </p>
            ) : (
              <p className="small muted">
                Adresse steht noch nicht fest. <span className="flag">offen</span>
              </p>
            )}
          </div>
          <div>
            <h2 className="foot-h">Kontakt</h2>
            <ul>
              {standort.telefon ? (
                <li>
                  <a href={`tel:${standort.telefon.replace(/\s+/g, "")}`}>
                    {standort.telefon}
                  </a>
                </li>
              ) : (
                <li className="small muted">
                  Telefon <span className="flag">offen</span>
                </li>
              )}
              {standort.email ? (
                <li>
                  <a href={`mailto:${standort.email}`}>{standort.email}</a>
                </li>
              ) : (
                <li className="small muted">
                  Mail <span className="flag">offen</span>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="foot-h">Seiten</h2>
            <ul>
              <li>
                <Link href={`${basis}/kurse`}>Kurse</Link>
              </li>
              <li>
                <Link href={`${basis}/abo`}>Abo &amp; Preise</Link>
              </li>
              <li>
                <Link href={`${basis}/studio`}>Studio</Link>
              </li>
              <li>
                <Link href={`${basis}/kontakt`}>Kontakt</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="foot-h">Buchen</h2>
            <ul>
              <li>
                <Link href={effektiveBookingUrl}>Online buchen</Link>
              </li>
              <li>
                <Link href={`${basis}/konto/profil`}>Mein Konto</Link>
              </li>
              <li>
                <Link href={`${basis}/abo#geschenkkarte`}>Geschenkkarte</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-end">
          <p>&copy; 2026 Reform You Pilates Studio</p>
          <ul>
            <li>
              <Link href={`${basis}/impressum`}>Impressum</Link>
            </li>
            <li>
              <Link href={`${basis}/agb`}>AGB</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
