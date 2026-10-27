import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, isTier, type Tier } from "@/lib/access";

/** Only admins get past this. Returns the admin's user id. */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await createAdminClient().from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) redirect("/");
  return user.id;
}

export const ACTIVE = ["active", "trialing", "past_due"];

type ProfileLite = { tier?: string | null; comp_tier?: string | null; subscription_status?: string | null };

/** The plan a profile is on (ignoring the site-wide free switch) and why. */
export function planOf(p: ProfileLite): { tier: Tier; label: string } {
  const paid = isTier(p.tier) && p.tier !== "free" && ACTIVE.includes(p.subscription_status ?? "") ? p.tier : null;
  const comp = isTier(p.comp_tier) ? p.comp_tier : null;
  const rank = (t: Tier | null) => (t ? Object.keys(PLANS).indexOf(t) : -1);
  if (paid && rank(paid) >= rank(comp)) return { tier: paid, label: `${PLANS[paid].name} (paid)` };
  if (comp) return { tier: comp, label: `${PLANS[comp].name} (free access)` };
  return { tier: "free", label: "Free" };
}

/** Dates in Eastern time, short. */
export const when = (iso: string | null | undefined, withTime = true) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
      })
    : "—";

/** Last sign-in and sign-in methods for every auth user, by id. */
export async function authInfo() {
  const map = new Map<string, { lastSignIn: string | null; providers: string[] }>();
  const db = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users.length) break;
    for (const u of data.users) {
      map.set(u.id, {
        lastSignIn: u.last_sign_in_at ?? null,
        providers: ((u.app_metadata?.providers as string[] | undefined) ?? [u.app_metadata?.provider as string]).filter(Boolean),
      });
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

export const monthStartIso = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};
