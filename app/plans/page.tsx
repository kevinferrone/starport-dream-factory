import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, PLANS, TIERS, RESTING_MESSAGE } from "@/lib/access";
import SetPassword from "./SetPassword";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { READING_LEVELS, DEFAULT_READING_LEVEL } from "@/lib/reading-level";
import { isGrownup } from "@/lib/grownup";
import { STARPORT_URL } from "@/lib/site";
import { setNewsOptIn } from "@/lib/news";

async function saveReadingLevel(formData: FormData) {
  "use server";
  const level = Number(formData.get("level"));
  if (!Number.isInteger(level) || level < 0 || level > 7) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isGrownup(user.id))) redirect("/grownups?next=/plans");
  await createAdminClient().from("profiles").update({ reading_level: level }).eq("id", user.id);
  revalidatePath("/plans");
  redirect("/plans?level=saved");
}

async function saveNews(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isGrownup(user.id))) redirect("/grownups?next=/plans");
  await setNewsOptIn(user.id, user.email, formData.get("news") === "yes");
  revalidatePath("/plans");
  redirect("/plans?news=saved");
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ welcome?: string; limit?: string; level?: string; error?: string; news?: string }> }) {
  const params = await searchParams;
  const { welcome, limit, level, error, news } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isGrownup(user.id))) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/grownups?next=${encodeURIComponent(`/plans${qs ? `?${qs}` : ""}`)}`);
  }
  const access = await getAccess(user.id);
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, tier, reading_level").eq("id", user.id).single();
  // Asked separately so the page still works if the news column hasn't been added yet.
  const { data: newsRow } = await supabase.from("profiles").select("news_opt_in").eq("id", user.id).single();


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

      <section className="panel" style={{ maxWidth: 560, margin: "0 auto 18px" }}>
        <h2>
          <span className="emoji" aria-hidden>🎲</span> Play the full game
        </h2>
        <p className="hint">
          Every Dream Factory card is made for Starport, the tabletop roleplaying game for kids. Grab the
          rulebook and bring your kid&apos;s creatures, equipment and pets to the table.
        </p>
        <a className="big-btn small" href={STARPORT_URL} target="_blank" rel="noopener noreferrer">
          Get Starport →
        </a>
      </section>

      <section className="panel" style={{ maxWidth: 560, margin: "0 auto 18px" }}>
        <form action={saveNews} className="form">
          <h2>
            <span className="emoji" aria-hidden>✉️</span> Starport news
          </h2>
          <p className="hint">
            About once a month: new Dream Factory ideas, Starport adventures, and news about new Starport games.
          </p>
          {news === "saved" && (
            <p className="error" style={{ background: "#d9fbef", color: "#0d6b4e" }}>Saved.</p>
          )}
          <label className="check">
            <input type="checkbox" name="news" value="yes" defaultChecked={!!(newsRow as { news_opt_in?: boolean } | null)?.news_opt_in} />
            <span>Email me Starport news</span>
          </label>
          <button className="big-btn small" type="submit">Save</button>
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
