import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, PLANS, type Tier } from "@/lib/access";
import SetPassword from "./SetPassword";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ welcome?: string; limit?: string }> }) {
  const { welcome, limit } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, tier").eq("id", user.id).single();

  const tiers: Tier[] = ["free", "plus", "pro"];
  const icons: Record<Tier, string> = { free: "🌱", plus: "⭐", pro: "🌟" };

  return (
    <>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
          <span aria-hidden>🔑</span> Grown-ups
        </h1>
        <p>
          Signed in as {user.email}. {access.remaining} of {access.limit} creations left
          {access.period === "month" ? " this month" : ""}.
        </p>
      </div>

      {welcome && <p className="error" style={{ background: "#d9fbef", color: "#0d6b4e", textAlign: "center" }}>Thank you! Your plan is ready. It can take a few seconds to show up here.</p>}
      {limit && <p className="error" style={{ textAlign: "center" }}>You&apos;ve used all your creations for now. Pick a plan to keep building.</p>}
      {access.source === "comp" && <p className="note">Your account has free {PLANS[access.tier].name} access.</p>}
      {access.source === "site" && <p className="note">Dream Factory is free for everyone right now!</p>}

      <div className="plans">
        {tiers.map((t) => {
          const p = PLANS[t];
          const current = access.tier === t;
          return (
            <div key={t} className={`plan${current ? " current" : ""}`}>
              <div style={{ fontSize: 52 }} aria-hidden>{icons[t]}</div>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              <div className="price">{p.price}</div>
              <p className="hint">{p.blurb}</p>
              {current ? (
                <span className="big-btn small plain">This is your plan</span>
              ) : t !== "free" ? (
                <form action="/api/stripe/checkout" method="post">
                  <input type="hidden" name="tier" value={t} />
                  <button className="big-btn small" type="submit" style={{ width: "100%" }}>
                    Choose {p.name}
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      <SetPassword />

      <div className="actions" style={{ paddingBottom: 40 }}>
        {profile?.stripe_customer_id && (
          <form action="/api/stripe/portal" method="post">
            <button className="big-btn small plain" type="submit">Manage or cancel my plan</button>
          </form>
        )}
        {access.isAdmin && (
          <a className="big-btn small gum" href="/admin">Admin</a>
        )}
        <form action="/auth/signout" method="post">
          <button className="big-btn small plain" type="submit">Sign out</button>
        </form>
      </div>
    </>
  );
}
