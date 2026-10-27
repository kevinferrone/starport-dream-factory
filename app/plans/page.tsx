import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, PLANS, TIERS, RESTING_MESSAGE } from "@/lib/access";
import SetPassword from "./SetPassword";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { READING_LEVELS, DEFAULT_READING_LEVEL } from "@/lib/reading-level";

async function saveReadingLevel(formData: FormData) {
  "use server";
  const level = Number(formData.get("level"));
  if (!Number.isInteger(level) || level < 0 || level > 7) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await createAdminClient().from("profiles").update({ reading_level: level }).eq("id", user.id);
  revalidatePath("/plans");
  redirect("/plans?level=saved");
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ welcome?: string; limit?: string; level?: string; error?: string }> }) {
  const { welcome, limit, level, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, tier, reading_level").eq("id", user.id).single();


  return (
    <>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
          <span aria-hidden>🔑</span> Grown-ups
        </h1>
        <p>
          Signed in as {user.email}. {access.summary}.
        </p>
      </div>

      {welcome && <p className="error" style={{ background: "#d9fbef", color: "#0d6b4e", textAlign: "center" }}>Thank you! Your plan is ready. It can take a few seconds to show up here.</p>}
      {error === "price" && (
        <p className="error" style={{ textAlign: "center" }}>
          Checkout is being set up and isn&apos;t ready yet. Please try again later.
        </p>
      )}
      {limit && (
        <p className="error" style={{ textAlign: "center" }}>
          {access.tier === "unlimited"
            ? RESTING_MESSAGE
            : "You've used all your creations for now. Pick a plan to keep building."}
        </p>
      )}
      {access.source === "comp" && <p className="note">Your account has free {PLANS[access.tier].name} access.</p>}
      {access.source === "site" && <p className="note">Dream Factory is free for everyone right now!</p>}

      <div className="plans">
        {TIERS.map((t) => {
          const p = PLANS[t];
          const current = access.tier === t;
          return (
            <div key={t} className={`plan${current ? " current" : ""}`}>
              <div style={{ fontSize: 52 }} aria-hidden>{p.icon}</div>
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

      <section className="panel" style={{ maxWidth: 560, margin: "0 auto 18px" }}>
        <form action={saveReadingLevel} className="form">
          <h2>
            <span className="emoji" aria-hidden>📖</span> Card reading level
          </h2>
          <p className="hint">
            New cards are written for this reader. The rules stay the same; only the words change.
          </p>
          {level === "saved" && (
            <p className="error" style={{ background: "#d9fbef", color: "#0d6b4e" }}>
              Saved. Your next cards will be written at this level.
            </p>
          )}
          <select name="level" defaultValue={profile?.reading_level ?? DEFAULT_READING_LEVEL} aria-label="Reading level">
            {READING_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                Write cards for a {l.label} reader
              </option>
            ))}
          </select>
          <button className="big-btn small" type="submit">Save reading level</button>
        </form>
      </section>

      <SetPassword />

      <div className="actions" style={{ paddingBottom: 40 }}>
        {profile?.stripe_customer_id && (
          <form action="/api/stripe/portal" method="post">
            <button className="big-btn small plain" type="submit">Manage or cancel my plan</button>
          </form>
        )}
        {access.isAdmin && (
          <Link className="big-btn small gum" href="/admin">Admin</Link>
        )}
        <form action="/auth/signout" method="post">
          <button className="big-btn small plain" type="submit">Sign out</button>
        </form>
      </div>
    </>
  );
}
