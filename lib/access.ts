import { createAdminClient } from "@/lib/supabase/admin";

export type Tier = "free" | "plus" | "pro";

/** Plan rules. Change the numbers here and everything else follows. */
export const PLANS: Record<
  Tier,
  { name: string; price: string; limit: number; period: "total" | "month"; blurb: string }
> = {
  free: { name: "Free", price: "$0", limit: 3, period: "total", blurb: "3 creations to try it out" },
  plus: { name: "Star", price: "$4.99/month", limit: 20, period: "month", blurb: "20 creations every month" },
  pro: { name: "Superstar", price: "$9.99/month", limit: 100, period: "month", blurb: "100 creations every month" },
};

/** Free "Shake up the stats" re-rolls allowed per card (stats are cheap; pictures count). */
export const MAX_REROLLS_PER_CARD = 10;

const RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };

export type Access = {
  tier: Tier;
  source: "paid" | "comp" | "site" | "free";
  used: number;
  limit: number;
  period: "total" | "month";
  remaining: number;
  isAdmin: boolean;
  parentConfirmed: boolean;
};

/** Works out which plan a user is on right now and how many builds they have left. */
export async function getAccess(userId: string): Promise<Access> {
  const db = createAdminClient();

  const [{ data: profile }, { data: settings }] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db.from("site_settings").select("*").eq("id", 1).single(),
  ]);

  const paidActive =
    profile?.tier && profile.tier !== "free" &&
    ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "");

  let tier: Tier = "free";
  let source: Access["source"] = "free";
  const consider = (t: Tier | null | undefined, s: Access["source"]) => {
    if (t && RANK[t] > RANK[tier]) {
      tier = t;
      source = s;
    }
  };
  if (paidActive) consider(profile.tier as Tier, "paid");
  consider(profile?.comp_tier as Tier | null, "comp");
  if (settings?.free_for_all) consider(settings.free_for_all_tier as Tier, "site");

  const plan = PLANS[tier];
  let query = db
    .from("creations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (plan.period === "month") {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }
  const { count } = await query;
  const used = count ?? 0;

  return {
    tier,
    source,
    used,
    limit: plan.limit,
    period: plan.period,
    remaining: Math.max(0, plan.limit - used),
    isAdmin: !!profile?.is_admin,
    parentConfirmed: !!profile?.parent_confirmed,
  };
}
