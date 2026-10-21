import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Mailversand über nodemailer mit SMTP-Zugangsdaten aus Umgebungsvariablen.
 * Fehlen sie, crasht nichts: es wird einmal verständlich geloggt und der
 * Versand übersprungen, genau wie der bestehende Datenbank-Fallback das für
 * Prisma schon macht (siehe src/lib/repositories/standorte.ts).
 *
 * Alle Mails per "Sie"-Anrede, Absendername "Janina von Reform You".
 */

let transporter: Transporter | null | undefined;
let warnungGezeigt = false;

function smtpKonfiguriert(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function holeTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!smtpKonfiguriert()) {
    if (!warnungGezeigt) {
      warnungGezeigt = true;
      console.warn(
        "[reform-you] Keine SMTP-Zugangsdaten hinterlegt (SMTP_HOST/SMTP_USER/SMTP_PASS " +
          "fehlen). Mailversand wird übersprungen. Siehe webapp/README.md.",
      );
    }
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export interface MailAnhang {
  filename: string;
  content: string;
  contentType?: string;
}

export async function sendeMail(params: {
  an: string;
  betreff: string;
  text: string;
  anhaenge?: MailAnhang[];
}): Promise<boolean> {
  const t = holeTransporter();
  if (!t) {
    console.log(`[reform-you] Mail übersprungen (kein SMTP): "${params.betreff}" an ${params.an}`);
    return false;
  }

  const from = process.env.SMTP_FROM ?? "Janina von Reform You <buchung@reform-you.de>";

  try {
    await t.sendMail({
      from,
      to: params.an,
      subject: params.betreff,
      text: params.text,
      attachments: params.anhaenge?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? "text/calendar",
      })),
    });
    return true;
  } catch (fehler) {
    console.error(`[reform-you] Mailversand fehlgeschlagen an ${params.an}:`, fehler);
    return false;
  }
}
