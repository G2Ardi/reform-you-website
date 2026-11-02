import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getMitarbeiter } from "@/lib/auth/admin";
import { adminLogoutAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const mitarbeiter = await getMitarbeiter();
  if (!mitarbeiter) redirect("/admin/login");

  const istAdmin = mitarbeiter.rolle === "ADMIN";
  const inhaber = istAdmin && mitarbeiter.darfUmsaetzeSehen;

  return (
    <>
      <header className="head head-solid">
        <div className="shell head-in">
          <Link className="mark" href="/admin" aria-label="Reform You, zur Terminübersicht">
            <Image
              src="/logo/reformyou-logo-dark.png"
              alt=""
              width={888}
              height={510}
              className="mark-logo"
            />
            <span className="mark-sub">{istAdmin ? "Admin" : "Trainer"}</span>
          </Link>
          <nav className="nav admin-nav" style={{ display: "flex" }}>
            <Link href="/admin">Termine</Link>
            {istAdmin ? <Link href="/admin/einstellungen">Einstellungen</Link> : null}
            {istAdmin ? <Link href="/admin/erinnerungen">Versand</Link> : null}
            {istAdmin ? <Link href="/admin/kulanz">Kulanz</Link> : null}
            {inhaber ? <Link href="/admin/umsatz">Umsatz</Link> : null}
            {inhaber ? <Link href="/admin/mitarbeiter">Mitarbeiter</Link> : null}
            <span className="small muted admin-nutzer">{mitarbeiter.name}</span>
            <form action={adminLogoutAction}>
              <button className="btn btn-line" type="submit">
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="inhalt">{children}</main>
    </>
  );
}
