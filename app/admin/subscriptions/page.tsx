import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, isPaidTier } from "@/lib/access";
import { ACTIVE, when } from "@/lib/admin";
import { stripeCustomerUrl } from "@/lib/stripe";

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment problem",
  canceled: "Ended",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id, email, tier, subscription_status, cancel_at_period_end, current_period_end, stripe_customer_id")
    .not("stripe_subscription_id", "is", null)
    .order("current_period_end", { ascending: true, nullsFirst: false });

  const rows = (data ?? []).filter((r) => all || ACTIVE.includes(r.subscription_status ?? ""));

  return (
    <>
      <h1 className="admin-title">Subscriptions</h1>
      <p className="hint">
        {all ? "Every subscription, including ended ones. " : "Active subscriptions only. "}
        <Link href={all ? "/admin/subscriptions" : "/admin/subscriptions?all=1"}>{all ? "Show active only" : "Show ended ones too"}</Link>
      </p>

      <div className="table-scroll">
        <table className="admin">
          <thead>
            <tr><th>Email</th><th>Plan</th><th>Status</th><th>Renews / ends</th><th>Stripe</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/users/${r.id}`}>{r.email}</Link></td>
                <td>{isPaidTier(r.tier) ? `${PLANS[r.tier].name} · ${PLANS[r.tier].price}` : "—"}</td>
                <td>
                  {STATUS[r.subscription_status ?? ""] ?? r.subscription_status}
                  {r.cancel_at_period_end && ACTIVE.includes(r.subscription_status ?? "") && <span className="pill warn">cancelling</span>}
                </td>
                <td className="nowrap">
                  {r.current_period_end ? `${r.cancel_at_period_end ? "Ends" : "Renews"} ${when(r.current_period_end, false)}` : "—"}
                </td>
                <td>
                  {r.stripe_customer_id && (
                    <a href={stripeCustomerUrl(r.stripe_customer_id)} target="_blank" rel="noreferrer">Open in Stripe</a>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5}>No subscriptions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Refunds, cancelling for someone, or changing a price happen in Stripe: use &quot;Open in Stripe.&quot;
      </p>
    </>
  );
}
