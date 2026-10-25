import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/access";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await createAdminClient().from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) redirect("/");
}

async function setSiteFree(formData: FormData) {
  "use server";
  await requireAdmin();
  const on = formData.get("free_for_all") === "on";
  const tier = formData.get("tier") === "plus" ? "plus" : "pro";
  await createAdminClient().from("site_settings").update({ free_for_all: on, free_for_all_tier: tier }).eq("id", 1);
  revalidatePath("/admin");
}

async function compEmail(formData: FormData) {
  "use server";
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const tier = String(formData.get("tier"));
  if (!email) return;
  const db = createAdminClient();
  const comp = tier === "plus" || tier === "pro" ? tier : null;
  // Already signed up → update now. Not yet → remember for when they do.
  const { data: existing } = await db.from("profiles").select("id").ilike("email", email);
  if (existing?.length) {
    await db.from("profiles").update({ comp_tier: comp }).ilike("email", email);
  }
  if (comp) await db.from("comp_invites").upsert({ email, comp_tier: comp });
  else await db.from("comp_invites").delete().eq("email", email);
  revalidatePath("/admin");
}

export default async function AdminPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: settings }, { data: comped }, { data: invites }, { count: users }, { count: builds }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("profiles").select("email, comp_tier, tier").not("comp_tier", "is", null),
    db.from("comp_invites").select("email, comp_tier"),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("creations").select("id", { count: "exact", head: true }),
  ]);

  return (
    <>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>Admin</h1>
        <p>{users ?? 0} accounts and {builds ?? 0} creations so far.</p>
      </div>

      <section className="panel">
        <h2>Free for everyone</h2>
        <p className="hint">Turn this on for a launch week or a promotion. Everyone gets the plan you pick here.</p>
        <form action={setSiteFree} className="form">
          <label className="check">
            <input type="checkbox" name="free_for_all" defaultChecked={!!settings?.free_for_all} />
            <span>Make Dream Factory free for everyone</span>
          </label>
          <select name="tier" defaultValue={settings?.free_for_all_tier ?? "pro"}>
            <option value="plus">{PLANS.plus.name} ({PLANS.plus.blurb})</option>
            <option value="pro">{PLANS.pro.name} ({PLANS.pro.blurb})</option>
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
            <option value="plus">{PLANS.plus.name} ({PLANS.plus.blurb})</option>
            <option value="pro">{PLANS.pro.name} ({PLANS.pro.blurb})</option>
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
                  <td>{PLANS[i.comp_tier as "plus" | "pro"].name}</td>
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
