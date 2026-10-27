import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, PAID_TIERS, isPaidTier, type PaidTier } from "@/lib/access";
import { requireAdmin, ACTIVE } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import ActivityTable from "@/components/admin/ActivityTable";

async function setSiteFree(formData: FormData) {
  "use server";
  await requireAdmin();
  const on = formData.get("free_for_all") === "on";
  const t = formData.get("tier");
  const tier = isPaidTier(t) ? t : "pro";
  await createAdminClient().from("site_settings").update({ free_for_all: on, free_for_all_tier: tier }).eq("id", 1);
  revalidatePath("/admin");
}

async function compEmail(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const t = formData.get("tier");
  if (!email) return;
  const db = createAdminClient();
  const comp = isPaidTier(t) ? t : null;
  // Already signed up → update now. Not yet → remember for when they do.
  const { data: existing } = await db.from("profiles").select("id").ilike("email", email);
  if (existing?.length) {
    await db.from("profiles").update({ comp_tier: comp }).ilike("email", email);
    await logActivity({ userId: existing[0].id, actorId: adminId, kind: "admin_comp", detail: comp ? PLANS[comp].name : "Removed" });
  }
  if (comp) await db.from("comp_invites").upsert({ email, comp_tier: comp });
  else await db.from("comp_invites").delete().eq("email", email);
  revalidatePath("/admin");
}

const PlanOptions = () => (
  <>
    {PAID_TIERS.map((t) => (
      <option key={t} value={t}>
        {PLANS[t].name} ({PLANS[t].blurb})
      </option>
    ))}
  </>
);

export default async function AdminPage() {
  const db = createAdminClient();
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * 864e5).toISOString();

  const [
    { data: settings },
    { data: comped },
    { data: invites },
    { count: users },
    { count: newUsers },
    { data: subs },
    { data: recentCards },
    { data: activity },
  ] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("profiles").select("email, comp_tier").not("comp_tier", "is", null),
    db.from("comp_invites").select("email, comp_tier"),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", ago(7)),
    db.from("profiles").select("tier, subscription_status, cancel_at_period_end").not("stripe_subscription_id", "is", null),
    db.from("creations").select("created_at, pictures:choices->pictures").gte("created_at", ago(30)).limit(20000),
    db.from("activity").select("user_id, kind, detail, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const active = (subs ?? []).filter((s) => ACTIVE.includes(s.subscription_status ?? "") && isPaidTier(s.tier));
  const byTier = Object.fromEntries(PAID_TIERS.map((t) => [t, active.filter((s) => s.tier === t).length])) as Record<PaidTier, number>;
  const monthly = active.reduce((sum, s) => sum + PLANS[s.tier as PaidTier].cents, 0) / 100;
  const cancelling = active.filter((s) => s.cancel_at_period_end).length;
  const pastDue = active.filter((s) => s.subscription_status === "past_due").length;

  const cards = recentCards ?? [];
  const inLast = (days: number) => cards.filter((c) => c.created_at >= ago(days)).length;
  const pics = cards.map((c) => Number(c.pictures)).filter((n) => n > 0);
  const avgPics = pics.length ? (pics.reduce((a, b) => a + b, 0) / pics.length).toFixed(2) : "—";

  const ids = [...new Set((activity ?? []).map((a) => a.user_id).filter(Boolean))];
  const { data: emails } = ids.length ? await db.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email]));

  return (
    <>
      <h1 className="admin-title">Overview</h1>

      <div className="stats">
        <Stat label="Accounts" value={users ?? 0} sub={`${newUsers ?? 0} new this week`} />
        <Stat label="Paying subscribers" value={active.length} sub={`${cancelling} cancelling · ${pastDue} payment problems`} />
        <Stat label="Monthly revenue (est.)" value={`$${monthly.toFixed(2)}`} sub="before Stripe fees" />
        <Stat label="Cards made" value={inLast(1)} sub={`today · ${inLast(7)} this week · ${inLast(30)} in 30 days`} />
        <Stat label="Pictures per card" value={avgPics} sub="last 30 days (1 = no redraws)" />
      </div>

      <section className="panel">
        <h2>Subscribers by plan</h2>
        <table className="admin">
          <tbody>
            {PAID_TIERS.map((t) => (
              <tr key={t}>
                <td>{PLANS[t].icon} {PLANS[t].name}</td>
                <td>{PLANS[t].price}</td>
                <td><b>{byTier[t]}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 10 }}><Link href="/admin/subscriptions">See every subscription →</Link></p>
      </section>

      <section className="panel">
        <h2>Latest activity</h2>
        <ActivityTable rows={activity ?? []} emailOf={emailOf} />
        <p className="hint" style={{ marginTop: 10 }}><Link href="/admin/activity">See all activity →</Link></p>
      </section>

      <section className="panel">
        <h2>Free for everyone</h2>
        <p className="hint">Turn this on for a launch week or a promotion. Everyone gets the plan you pick here.</p>
        <form action={setSiteFree} className="form">
          <label className="check">
            <input type="checkbox" name="free_for_all" defaultChecked={!!settings?.free_for_all} />
            <span>Make Dream Factory free for everyone</span>
          </label>
          <select name="tier" defaultValue={settings?.free_for_all_tier ?? "pro"}>
            <PlanOptions />
          </select>
          <button className="big-btn small" type="submit">Save</button>
        </form>
      </section>

      <section className="panel">
        <h2>Give someone free access</h2>
        <p className="hint">Works whether or not they&apos;ve signed up yet. Choose &quot;Remove&quot; to take it away.</p>
        <form action={compEmail} className="form">
          <input type="email" name="email" placeholder="friend@example.com" required aria-label="Email" />
          <select name="tier" defaultValue="pro">
            <PlanOptions />
            <option value="none">Remove free access</option>
          </select>
          <button className="big-btn small" type="submit">Save</button>
        </form>

        <table className="admin" style={{ marginTop: 18 }}>
          <thead>
            <tr><th>Email</th><th>Free plan</th><th>Signed up</th></tr>
          </thead>
          <tbody>
            {(invites ?? []).map((i) => {
              const joined = comped?.some((c) => c.email?.toLowerCase() === i.email);
              return (
                <tr key={i.email}>
                  <td>{i.email}</td>
                  <td>{isPaidTier(i.comp_tier) ? PLANS[i.comp_tier].name : i.comp_tier}</td>
                  <td>{joined ? "Yes" : "Not yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
