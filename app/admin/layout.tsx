import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-wrap">
      <nav className="admin-nav" aria-label="Admin">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/subscriptions">Subscriptions</Link>
        <Link href="/admin/activity">Activity</Link>
        <a href="/admin/news-list">News list (CSV)</a>
      </nav>
      {children}
    </div>
  );
}
