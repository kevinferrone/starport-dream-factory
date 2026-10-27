import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { when } from "@/lib/admin";
import type { ActivityKind } from "@/lib/activity";
import ActivityTable from "@/components/admin/ActivityTable";

const FILTERS: { key: string; label: string; kinds?: ActivityKind[] }[] = [
  { key: "all", label: "Everything" },
  { key: "builds", label: "Cards", kinds: ["build"] },
  {
    key: "billing",
    label: "Billing",
    kinds: ["subscribed", "plan_changed", "cancel_scheduled", "cancel_undone", "subscription_ended", "payment_problem"],
  },
  {
    key: "admin",
    label: "Admin actions",
    kinds: ["admin_login_as", "admin_restore", "admin_unrestore", "admin_comp", "admin_signin_link"],
  },
];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];
  const db = createAdminClient();

  let q = db.from("activity").select("user_id, kind, detail, created_at").order("created_at", { ascending: false }).limit(300);
  if (filter.kinds) q = q.in("kind", filter.kinds);
  const [{ data: activity }, { data: signups }, { data: cards }] = await Promise.all([
    q,
    filter.key === "all"
      ? db.from("profiles").select("id, created_at").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] as { id: string; created_at: string }[] }),
    db
      .from("creations")
      .select("id, user_id, kind, card, image_url, created_at, refunded, pictures:choices->pictures")
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  // Sign-ups come from accounts, so they show up even from before the activity log existed.
  const rows = [
    ...(activity ?? []),
    ...(signups ?? []).map((s) => ({ user_id: s.id, kind: "signup", detail: null, created_at: s.created_at })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 300);

  const ids = [...new Set([...rows.map((r) => r.user_id), ...(cards ?? []).map((c) => c.user_id)].filter(Boolean))] as string[];
  const { data: emails } = ids.length ? await db.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email as string]));

  return (
    <>
      <h1 className="admin-title">Activity</h1>

      <section className="panel">
        <h2>Newest cards</h2>
        <div className="admin-cards">
          {(cards ?? []).map((c) => (
            <Link key={c.id} href={`/admin/users/${c.user_id}`} className={`admin-card${c.refunded ? " refunded" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image_url ? <img src={c.image_url} alt="" /> : <div className="noimg" />}
              <b>{(c.card as { name?: string })?.name}</b>
              <span>{c.kind} · {when(c.created_at)}</span>
              <span>{emailOf.get(c.user_id)}</span>
              {Number(c.pictures) > 1 && <span className="pill">{String(c.pictures)} pictures</span>}
              {c.refunded && <span className="pill">restored</span>}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Log</h2>
        <div className="admin-filters">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/activity?show=${f.key}`} className={f.key === filter.key ? "on" : ""}>
              {f.label}
            </Link>
          ))}
        </div>
        <ActivityTable rows={rows} emailOf={emailOf} />
      </section>
    </>
  );
}
