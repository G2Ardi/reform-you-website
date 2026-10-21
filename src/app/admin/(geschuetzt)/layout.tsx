import { redirect } from "next/navigation";
import Link from "next/link";
import { istAdminEingeloggt } from "@/lib/auth/admin";
import { adminLogoutAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await istAdminEingeloggt())) redirect("/admin/login");

  return (
    <>
      <header className="head head-solid">
        <div className="shell head-in">
          <Link className="mark" href="/admin">
            <span className="mark-word">reform you</span>
            <span className="mark-sub">Admin</span>
          </Link>
          <nav className="nav" style={{ display: "flex" }}>
            <Link href="/admin">Termine</Link>
            <Link href="/admin/einstellungen">Einstellungen</Link>
            <Link href="/admin/erinnerungen">Erinnerungen</Link>
            <Link href="/admin/kulanz">Kulanz</Link>
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
