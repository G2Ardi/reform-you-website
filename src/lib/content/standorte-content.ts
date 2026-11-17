/**
 * Reform You Pilates Studio, redaktioneller Inhalt pro Standort.
 *
 * Reine Daten, keine Datenbank-IDs. Zwei Verbraucher teilen sich diese
 * Datei als einzige Quelle:
 *  - prisma/seed.ts schreibt sie in die Datenbank
 *  - src/lib/mock-data.ts baut daraus den Offline-Fallback fuer den Fall,
 *    dass keine DATABASE_URL gesetzt ist (siehe README)
 *
 * Alle echten Angaben stammen aus der bestehenden statischen Fassung der
 * Seite (../../../index.html usw.) und aus dem Auftragstext. Nichts davon
 * ist erfunden. Fehlende Angaben stehen explizit als "offen" markiert,
 * siehe `offen: true` Felder und die `hinweis`-Texte.
 */

export type SkalaArt = "POSITION" | "OHNE_FEDER";
export type PreisTyp = "ABO" | "EINZELSTUNDE" | "GESCHENKKARTE" | "KARTE" | "EVENT";
export type ProduktTyp = "ABO" | "EINZELSTUNDE" | "GESCHENKKARTE";

export interface KursContent {
  slug: string;
  name: string;
  dauerMinuten: number | null;
  beschreibung: string;
  skalaArt: SkalaArt;
  skalaPosition: number | null;
  skalaLabel: string | null;
  hinweis: string | null;
  offenerHinweis: string | null;
  reihenfolge: number;
  /** Preis der Einzelstunde in Cent, von Janina fuer alle vier Formate bestaetigt */
  preisEinzelCent: number;
  /** Ob eine 5er-/10er-Karte fuer dieses Format eingeloest werden darf */
  karteGueltig: boolean;
  karteGueltigOffen: boolean;
  kapazitaetStandard: number;
  kapazitaetOffen: boolean;
}

export interface AboModellContent {
  name: string;
  beschreibung: string;
  reihenfolge: number;
}

export interface PreisContent {
  typ: PreisTyp;
  bezeichnung: string;
  betragCent: number | null;
  einheit: string | null;
  hinweis: string | null;
  offen: boolean;
}

export interface EventContent {
  slug: string;
  titel: string;
  beschreibung: string;
  /** ISO-Datum des letzten bekannten Termins, nicht zwingend der naechste */
  datum: string | null;
  startzeit: string | null;
  endzeit: string | null;
  ort: string | null;
  preisCent: number | null;
  wiederkehrend: boolean;
  offenerHinweis: string | null;
  reihenfolge: number;
}

export interface ProduktContent {
  typ: ProduktTyp;
  name: string;
  beschreibung: string | null;
  preisCent: number | null;
}

export interface StandortContent {
  slug: string;
  name: string;
  aktivSeit: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
  oeffnungszeiten: string | null;
  oeffnungszeitenOffen: boolean;
  parkhinweis: string | null;
  parkhinweisOffen: boolean;
  gruppengroesse: string | null;
  gruppengroesseOffen: boolean;
  hinweis: string | null;
  reihenfolge: number;
  kurse: KursContent[];
  aboModelle: AboModellContent[];
  preise: PreisContent[];
  events: EventContent[];
  produkte: ProduktContent[];
}

/**
 * Komplett neues Kursangebot, abgeglichen mit Janinas Antworten im
 * Fragenkatalog (siehe "../../../../Fragenkatalog Antworten.md"). Ersetzt
 * die alten Wix-Platzhalternamen (Anfänger/Fortgeschritten/Beach
 * Morning/Matten Pilates/Mom & Baby) vollständig.
 *
 * Die Dauer der drei Reformer-Formate wurde von Janina nicht bestätigt.
 * 50 Minuten ist der bisherige Wert für alle Kurse und wird als Annahme
 * übernommen, sichtbar markiert über offenerHinweis (Flag-Komponente).
 */
const reformerKurse: KursContent[] = [
  {
    slug: "reformer-basics",
    name: "Reformer Basics",
    dauerMinuten: 50,
    beschreibung:
      "Lerne die Grundlagen, bewusste Atmung und kontrollierte Bewegung auf dem Reformer kennen. Für mehr Verbindung zwischen Körper und Kopf.",
    skalaArt: "POSITION",
    skalaPosition: 22,
    skalaLabel: "einstieg",
    hinweis: "kein Vorwissen nötig",
    offenerHinweis: "Dauer (50 Minuten) von Janina noch zu bestätigen",
    reihenfolge: 0,
    preisEinzelCent: 2600,
    karteGueltig: true,
    karteGueltigOffen: false,
    kapazitaetStandard: 6,
    kapazitaetOffen: false,
  },
  {
    slug: "reformer-flow",
    name: "Reformer Flow",
    dauerMinuten: 50,
    beschreibung:
      "Baue auf deinen Grundlagen auf. Mehr Intensität, fließende Bewegungen und neue Herausforderungen. Für mehr Kraft, Balance und Kontrolle.",
    skalaArt: "POSITION",
    skalaPosition: 68,
    skalaLabel: "fortgeschritten",
    hinweis: "Grundlagen vorausgesetzt",
    offenerHinweis: "Dauer (50 Minuten) von Janina noch zu bestätigen",
    reihenfolge: 1,
    preisEinzelCent: 2600,
    karteGueltig: true,
    karteGueltigOffen: false,
    kapazitaetStandard: 6,
    kapazitaetOffen: false,
  },
  {
    slug: "reformer-cardio",
    name: "Reformer Cardio, Jumpboard",
    dauerMinuten: 50,
    beschreibung:
      "Mehr Schwung in dein Training. Dynamische Sprünge mit dem Jumpboard verbinden Pilates mit Ausdauer. Für mehr Kraft, Koordination und neue Energie.",
    skalaArt: "POSITION",
    skalaPosition: 92,
    skalaLabel: "intensiv",
    hinweis: "Grundlagen vorausgesetzt",
    offenerHinweis: "Dauer (50 Minuten) von Janina noch zu bestätigen",
    reihenfolge: 2,
    preisEinzelCent: 2600,
    karteGueltig: true,
    karteGueltigOffen: false,
    kapazitaetStandard: 6,
    kapazitaetOffen: false,
  },
  {
    slug: "reformer-deep-stretch",
    name: "Reformer Deep Stretch",
    dauerMinuten: 50,
    beschreibung:
      "Dehnung deines ganzen Körpers mit Unterstützung des Reformers. Sanfte Bewegungen und bewusste Atmung schenken dir Zeit zum Loslassen und Durchatmen.",
    skalaArt: "POSITION",
    skalaPosition: 35,
    skalaLabel: "dehnung",
    hinweis: null,
    offenerHinweis: "Dauer (50 Minuten) von Janina noch zu bestätigen",
    reihenfolge: 3,
    preisEinzelCent: 2600,
    karteGueltig: true,
    karteGueltigOffen: false,
    kapazitaetStandard: 6,
    kapazitaetOffen: false,
  },
  {
    slug: "mommy-mini",
    name: "Pilates x Mommy & Mini",
    dauerMinuten: 50,
    beschreibung:
      "Pilates auf der Matte für Mamas mit Babys oder Kleinkindern, 50 Minuten. Training, ohne vorher eine Betreuung organisieren zu müssen. Wenn das Kind dazwischenredet, ist das eingeplant.",
    skalaArt: "OHNE_FEDER",
    skalaPosition: null,
    skalaLabel: null,
    hinweis: "Baby oder Kleinkind dabei",
    offenerHinweis:
      "Kapazität (6 Plätze) ist ein Platzhalter, von Janina nicht bestätigt. Ob die Guthabenkarten hier gelten, ist ebenfalls offen, siehe Hinweis bei den Karten.",
    reihenfolge: 4,
    preisEinzelCent: 2000,
    karteGueltig: false,
    karteGueltigOffen: false,
    kapazitaetStandard: 6,
    kapazitaetOffen: true,
  },
];

const wassenbergKurse: KursContent[] = reformerKurse;

/**
 * Wegberg startet offiziell erst zum 1. Januar 2027 (siehe `hinweis` auf dem
 * Standort weiter unten). Für die hier geforderte, sofort testbare
 * Buchungsstrecke bekommt Wegberg trotzdem dieselben vier Kursformate und
 * eigene Kurstermine, damit sich eine Karte wie gefordert an BEIDEN
 * Standorten ausprobieren lässt. Das ist eine bewusste Abweichung von der
 * bisherigen Marketing-Annahme "Wegberg zeigt nur einen Hinweis", siehe
 * Auftrag zum Buchungssystem.
 */
const wegbergKurse: KursContent[] = reformerKurse;

// Abos gibt es laut Janina noch keine ("Abos/Mitgliedschaften? → Noch
// keine", Fragenkatalog Abschnitt 5). Das Abo-Modell bleibt deshalb leer,
// die Preisseite zeigt stattdessen die Einzelstunden- und Kartenpreise.
const wassenbergAbos: AboModellContent[] = [];

const wassenbergPreise: PreisContent[] = [
  {
    typ: "EINZELSTUNDE",
    bezeichnung: "Reformer Basics, Reformer Flow, Reformer Cardio (Jumpboard), Reformer Deep Stretch",
    betragCent: 2600,
    einheit: "pro Einzelstunde",
    hinweis: null,
    offen: false,
  },
  {
    typ: "EINZELSTUNDE",
    bezeichnung: "Pilates x Mommy & Mini",
    betragCent: 2000,
    einheit: "pro Einzelstunde",
    hinweis: null,
    offen: false,
  },
  {
    typ: "KARTE",
    bezeichnung: "5 Credits",
    betragCent: 12500,
    einheit: "3 Monate gültig",
    hinweis:
      "Gilt für die vier Reformer-Kurse, an beiden Standorten einlösbar. Pilates x Mommy & Mini ist nur als Einzelstunde buchbar.",
    offen: false,
  },
  {
    typ: "KARTE",
    bezeichnung: "10 Credits",
    betragCent: 23000,
    einheit: "6 Monate gültig",
    hinweis:
      "Gilt für die vier Reformer-Kurse, an beiden Standorten einlösbar. Pilates x Mommy & Mini ist nur als Einzelstunde buchbar.",
    offen: false,
  },
  {
    typ: "GESCHENKKARTE",
    bezeichnung: "Wertgutschein",
    betragCent: null,
    einheit: "frei wählbarer Betrag",
    hinweis: "Online oder zur Abholung im Studio, einlösbar auf alle Kurse.",
    offen: false,
  },
  {
    typ: "EVENT",
    bezeichnung: "Pilates, Paint & Wine",
    betragCent: 5900,
    einheit: "pro Person",
    hinweis: "Material, Snacks und Wein enthalten",
    offen: false,
  },
];

const wassenbergEvents: EventContent[] = [
  {
    slug: "paint-and-wine",
    titel: "Pilates, Paint & Wine",
    beschreibung:
      "Der Abend beginnt mit einer Pilates-Einheit von 50 Minuten. Danach wird gemalt, jede auf ihrer eigenen Leinwand. Dazu Snacks und ausgewählte Weine, während die Sonne untergeht.",
    datum: "2026-08-29",
    startzeit: "18:00",
    endzeit: "21:00",
    ort: "Studio Wassenberg-Birgelen",
    preisCent: 5900,
    wiederkehrend: true,
    offenerHinweis: "Nächster Termin wird angekündigt",
    reihenfolge: 0,
  },
];

const wassenbergProdukte: ProduktContent[] = [
  {
    typ: "ABO",
    name: "Abo Reformer Pilates",
    beschreibung: "Preis und Laufzeit stehen noch nicht fest.",
    preisCent: null,
  },
  {
    typ: "EINZELSTUNDE",
    name: "Einzelstunde",
    beschreibung: "Einzeltermin ohne Abo.",
    preisCent: null,
  },
  {
    typ: "GESCHENKKARTE",
    name: "Geschenkkarte",
    beschreibung: "Einlösbar auf alle Kurse.",
    preisCent: null,
  },
];

export const standorteContent: StandortContent[] = [
  {
    slug: "wassenberg",
    name: "Wassenberg",
    aktivSeit: null,
    strasse: "Lambertusstraße 85",
    plz: "41849",
    ort: "Wassenberg-Birgelen",
    telefon: "+49 160 2910068",
    email: "info@reform-you.de",
    oeffnungszeiten: null,
    oeffnungszeitenOffen: true,
    parkhinweis: null,
    parkhinweisOffen: true,
    gruppengroesse: null,
    gruppengroesseOffen: true,
    hinweis: null,
    reihenfolge: 0,
    kurse: wassenbergKurse,
    aboModelle: wassenbergAbos,
    preise: wassenbergPreise,
    events: wassenbergEvents,
    produkte: wassenbergProdukte,
  },
  {
    slug: "wegberg",
    name: "Wegberg",
    aktivSeit: "2027-01-01",
    // Adresse von Janina bestätigt (Fragenkatalog Antworten, Abschnitt 2),
    // Öffnungszeiten, Telefon und Mail stehen noch nicht fest.
    strasse: "Hauptstraße 46",
    plz: "41844",
    ort: "Wegberg",
    telefon: null,
    email: null,
    oeffnungszeiten: null,
    oeffnungszeitenOffen: true,
    parkhinweis: null,
    parkhinweisOffen: true,
    gruppengroesse: null,
    gruppengroesseOffen: true,
    hinweis:
      "Offizieller Start ab dem 1. Januar 2027. Kurse und Buchung sind hier bereits als Testumgebung für das neue Buchungssystem freigeschaltet, bevor der reguläre Betrieb beginnt.",
    reihenfolge: 1,
    kurse: wegbergKurse,
    aboModelle: [],
    preise: wassenbergPreise,
    events: [],
    produkte: [],
  },
];

export function findStandortContent(slug: string): StandortContent | undefined {
  return standorteContent.find((s) => s.slug === slug);
}

/** Studio-Inhalt, standortunabhaengig: die Marke und Janina sind an
 * beiden Standorten gleich, nur die Adressdaten unterscheiden sich. */
export const studioContent = {
  ueberschrift: "Persönlich. Achtsam. Gemeinsam",
  lede:
    "Kleine Gruppen, persönliche Begleitung und eine Atmosphäre, in der du dich wohlfühlen kannst. Auf sechs Reformern nehmen wir uns Zeit für bewusste Bewegung, neue Stärke und dich ganz in deinem Tempo.",
  janinaName: "Janina Conrady",
  janinaBio: {
    gruss: "Hi, ich bin Janina!",
    rolle: "Inhaberin von Reform You, Pilates Trainerin und Mama von zwei Töchtern",
    absaetze: [
      "Sport und Bewegung waren schon immer ein großer Teil meines Lebens. Während der Schwangerschaft mit meiner zweiten Tochter habe ich meine Ausbildung zur Pilates Trainerin begonnen und anschließend erfolgreich abgeschlossen.",
      "Pilates bedeutet für mich mehr als Training: Es verbindet Kraft, Kontrolle und Leichtigkeit und schafft ein ganz neues Körpergefühl. Genau diese Begeisterung möchte ich in jeder Stunde an dich weitergeben.",
    ],
    schluss: "Ich freue mich dich kennenzulernen!",
  },
  merkmale: [
    {
      label: "Kleine Gruppen",
      text: "Sechs Reformer, maximal sechs Teilnehmende. So bleibt Raum, auf dich einzugehen und dich bei jeder Bewegung aufmerksam zu begleiten.",
    },
    {
      label: "Persönliche Begleitung",
      text: "Wir lernen dich und deine Ziele kennen. Mit individuellen Tipps und passenden Anpassungen unterstützen wir dich dabei, in deinem Tempo Fortschritte zu machen.",
    },
    {
      label: "Wohlfühlatmosphäre",
      text: "Warme Farben, eine ruhige Umgebung und ein herzliches Miteinander. Ein Ort, an dem du ankommen, durchatmen und dir Zeit für dich nehmen kannst.",
    },
  ],
  communityUeberschrift: "Zusammen bewegen. Verbunden bleiben.",
  communityText:
    "Auch abseits der Kurse bleiben wir in Verbindung. In unserer Community Gruppe findest du Neuigkeiten, kommende Events und Platz für Austausch. Sei dabei, wenn du magst kostenlos und ganz unverbindlich.",
  abschlussUeberschrift: "Deine Zeit für dich beginnt hier.",
  abschlussText:
    "Lerne unser Studio kennen und entdecke, wie gut sich bewusste Bewegung anfühlen kann. Buche deinen ersten Reformer Basics Kurs. Wir freuen uns auf dich.",
};

/** Titel und Zusatz der Kurse auf der Startseite, nach Janinas Text. */
export const kursKurzinfo: Record<string, { titel: string; zusatz: string | null }> = {
  "reformer-basics": { titel: "Reformer Basics", zusatz: "Einstieg" },
  "reformer-flow": { titel: "Reformer Flow", zusatz: "Fortgeschritten" },
  "reformer-cardio": { titel: "Reformer Cardio", zusatz: "Jumpboard" },
  "reformer-deep-stretch": { titel: "Reformer Deep Stretch", zusatz: null },
};

export const unternehmen = {
  name: "Myfairtrieb Vertriebsgesellschaft mbH",
  strasse: "Im Junkerbruch 11a",
  plz: "41849",
  ort: "Wassenberg",
  vertretenDurch: "Janina Conrady",
  ustId: "DE458520957",
  handelsregisterOffen: true,
};
