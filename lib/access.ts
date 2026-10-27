import { createAdminClient } from "@/lib/supabase/admin";

export type Tier = "free" | "plus" | "pro" | "max" | "unlimited";
export type PaidTier = Exclude<Tier, "free">;

/** Lowest to highest. */
export const TIERS: Tier[] = ["free", "plus", "pro", "max", "unlimited"];
export const PAID_TIERS: PaidTier[] = ["plus", "pro", "max", "unlimited"];

/**
 * Plan rules. Change the numbers or names here and everything else follows.
 * limit null = no monthly limit. daily = most creations in any 24 hours.
 */
export const PLANS: Record<
  Tier,
  { name: string; icon: string; price: string; cents: number; limit: number | null; daily?: number; period: "total" | "month"; blurb: string }
> = {
  free: { name: "Free", icon: "🌱", price: "$0", cents: 0, limit: 3, period: "total", blurb: "3 creations to try it out" },
  plus: { name: "Star", icon: "⭐", price: "$4.99/month", cents: 499, limit: 20, period: "month", blurb: "20 creations every month" },
  pro: { name: "Superstar", icon: "🌟", price: "$9.99/month", cents: 999, limit: 50, period: "month", blurb: "50 creations every month" },
  max: { name: "Supernova", icon: "💫", price: "$19.99/month", cents: 1999, limit: 100, period: "month", blurb: "100 creations every month" },
  unlimited: {
    name: "Galaxy",
    icon: "🌌",
    price: "$99/month",
    cents: 9900,
    limit: null,
    daily: 50,
    period: "month",
    blurb: "Unlimited creations (up to 50 a day)",
  },
};

/** Free "Change the stats" re-rolls allowed per card (stats are cheap; pictures count). */
export const MAX_REROLLS_PER_CARD = 10;

const RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2, max: 3, unlimited: 4 };
export const isTier = (t: unknown): t is Tier => typeof t === "string" && t in RANK;
export const isPaidTier = (t: unknown): t is PaidTier => isTier(t) && t !== "free";

export type Access = {
  tier: Tier;
  source: "paid" | "comp" | "site" | "free";
  used: number;
  limit: number | null;
  period: "total" | "month";
  usedToday: number;
  daily?: number;
  remaining: number;
  /** One line for the meter, e.g. "12 of 20 creations left this month". */
  summary: string;
  isAdmin: boolean;
  parentConfirmed: boolean;
};

const monthStart = () => {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
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
  const consider = (t: unknown, s: Access["source"]) => {
    if (isTier(t) && RANK[t] > RANK[tier]) {
      tier = t;
      source = s;
    }
  };
  if (paidActive) consider(profile.tier, "paid");
  consider(profile?.comp_tier, "comp");
  if (settings?.free_for_all) consider(settings.free_for_all_tier, "site");

  const plan = PLANS[tier];
  // Creations restored by an admin (refunded) don't count.
  const count = async (since?: Date) => {
    let q = db.from("creations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("refunded", false);
    if (since) q = q.gte("created_at", since.toISOString());
    const { count } = await q;
    return count ?? 0;
  };
  const [used, usedToday] = await Promise.all([
    count(plan.period === "month" ? monthStart() : undefined),
    count(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  ]);

  const left: number[] = [];
  if (plan.limit !== null) left.push(plan.limit - used);
  if (plan.daily) left.push(plan.daily - usedToday);
  const remaining = Math.max(0, Math.min(...left));

  const summary =
    plan.limit === null
      ? `Unlimited creations (${remaining} of ${plan.daily} left today)`
      : `${remaining} of ${plan.limit} creations left${plan.period === "month" ? " this month" : ""}`;

  return {
    tier,
    source,
    used,
    limit: plan.limit,
    period: plan.period,
    usedToday,
    daily: plan.daily,
    remaining,
    summary,
    isAdmin: !!profile?.is_admin,
    parentConfirmed: !!profile?.parent_confirmed,
  };
}
