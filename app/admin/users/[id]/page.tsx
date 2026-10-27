import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess, PLANS, PAID_TIERS, isPaidTier } from "@/lib/access";
import { requireAdmin, when } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { stripeCustomerUrl } from "@/lib/stripe";
import ActivityTable from "@/components/admin/ActivityTable";

// ---------- Support actions ----------

/** Signs YOUR browser in as this user, to see exactly what they see. */
async function loginAs(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("email").eq("id", id).single();
  if (!p?.email) return;
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: p.email });
  if (error || !data?.properties?.hashed_token) throw new Error("Couldn't make a sign-in link for this user.");
  await logActivity({ userId: id, actorId: adminId, kind: "admin_login_as" });
  redirect(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`);
}

/** Emails the user a fresh sign-in link. */
async function sendSignInLink(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("email").eq("id", id).single();
  if (!p?.email) return;
  const anon = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { error } = await anon.auth.signInWithOtp({
    email: p.email,
    options: { shouldCreateUser: false, emailRedirectTo: site ? `${site}/auth/callback` : undefined },
  });
  await logActivity({ userId: id, actorId: adminId, kind: "admin_signin_link", detail: error ? `Failed: ${error.message}` : p.email });
  redirect(`/admin/users/${id}?msg=${error ? "linkfail" : "linksent"}`);
}

/** Gives back a used creation (or undoes that). Restored creations don't count toward the plan. */
async function setRestored(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const creationId = String(formData.get("creation"));
  const restore = formData.get("restore") === "1";
  const db = createAdminClient();
  const { data: c } = await db
    .from("creations")
    .update({ refunded: restore })
    .eq("id", creationId)
    .eq("user_id", id)
    .select("card")
    .single();
  await logActivity({
    userId: id,
    actorId: adminId,
    kind: restore ? "admin_restore" : "admin_unrestore",
    detail: (c?.card as { name?: string })?.name,
  });
  revalidatePath(`/admin/users/${id}`);
}

/** Gives back the user's most recent N creations at once. */
async function restoreRecent(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const n = Math.min(100, Math.max(1, Number(formData.get("n")) || 0));
  const db = createAdminClient();
  const { data: recent } = await db
    .from("creations")
    .select("id")
    .eq("user_id", id)
    .eq("refunded", false)
    .order("created_at", { ascending: false })
    .limit(n);
  const ids = (recent ?? []).map((r) => r.id);
  if (ids.length) {
    await db.from("creations").update({ refunded: true }).in("id", ids);
    await logActivity({ userId: id, actorId: adminId, kind: "admin_restore", detail: `${ids.length} most recent` });
  }
  redirect(`/admin/users/${id}?msg=restored${ids.length}`);
}

/** Free access for this user. */
async function setComp(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const t = formData.get("tier");
  const comp = isPaidTier(t) ? t : null;
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").update({ comp_tier: comp }).eq("id", id).select("email").single();
  if (p?.email) {
    if (comp) await db.from("comp_invites").upsert({ email: p.email.toLowerCase(), comp_tier: comp });
    else await db.from("comp_invites").delete().eq("email", p.email.toLowerCase());
  }
  await logActivity({ userId: id, actorId: adminId, kind: "admin_comp", detail: comp ? PLANS[comp].name : "Removed" });
  revalidatePath(`/admin/users/${id}`);
}

// ---------- Page ----------

const MESSAGES: Record<string, string> = {
  linksent: "Sign-in link sent.",
  linkfail: "Couldn't send the link. Check the Activity log for the reason.",
};

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id } = await params;
  const { msg } = await searchParams;
  const db = createAdminClient();

  const { data: p } = await db.from("profiles").select("*").eq("id", id).single();
  if (!p) notFound();

  const [access, { data: authUser }, { data: cards }, { data: activity }] = await Promise.all([
    getAccess(id),
    db.auth.admin.getUserById(id),
    db
      .from("creations")
      .select("id, kind, card, image_url, status, refunded, created_at, pictures:choices->pictures")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
    db.from("activity").select("user_id, kind, detail, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  const u = authUser?.user;
  const providers = ((u?.app_metadata?.providers as string[] | undefined) ?? []).join(", ") || "email";
  const message = msg?.startsWith("restored") ? `Restored ${msg.slice(8)} creations.` : msg ? MESSAGES[msg] : null;

  return (
    <>
      <p className="hint"><Link href="/admin/users">← All users</Link></p>
      <h1 className="admin-title">{p.email}</h1>
      {message && <p className="error ok-msg">{message}</p>}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Plan right now</div>
          <div className="stat-value">{PLANS[access.tier].icon} {PLANS[access.tier].name}</div>
          <div className="stat-sub">
            {access.source === "paid" ? "Paying" : access.source === "comp" ? "Free access from you" : access.source === "site" ? "Site-wide free switch" : "Free plan"}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Creations</div>
          <div className="stat-value">{access.remaining} left</div>
          <div className="stat-sub">{access.summary}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Subscription</div>
          <div className="stat-value">
            {({ active: "Active", trialing: "Trial", past_due: "Payment problem", canceled: "Ended", unpaid: "Unpaid" } as Record<string, string>)[
              p.subscription_status ?? ""
            ] ?? (p.subscription_status || "None")}
          </div>
          <div className="stat-sub">
            {p.current_period_end ? `${p.cancel_at_period_end ? "Ends" : "Renews"} ${when(p.current_period_end, false)}` : "—"}
            {p.stripe_customer_id && (
              <>
                {" · "}
                <a href={stripeCustomerUrl(p.stripe_customer_id)} target="_blank" rel="noreferrer">Open in Stripe</a>
              </>
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Account</div>
          <div className="stat-value" style={{ fontSize: 18 }}>Joined {when(p.created_at, false)}</div>
          <div className="stat-sub">
            Last sign-in {when(u?.last_sign_in_at)} · signs in with {providers}
            {!p.parent_confirmed && " · grown-up step not finished"}
          </div>
        </div>
      </div>

      <section className="panel">
        <h2>Help this user</h2>
        <div className="admin-actions">
          <form action={loginAs}>
            <input type="hidden" name="id" value={id} />
            <button className="big-btn small" type="submit">Log in as this user</button>
            <p className="hint">Signs you out of your own account. Sign back in as yourself when you&apos;re done.</p>
          </form>
          <form action={sendSignInLink}>
            <input type="hidden" name="id" value={id} />
            <button className="big-btn small plain" type="submit">Email them a sign-in link</button>
          </form>
          <form action={restoreRecent} className="inline-form">
            <input type="hidden" name="id" value={id} />
            <span>Give back their last</span>
            <input type="number" name="n" min={1} max={100} defaultValue={1} aria-label="How many" />
            <button className="big-btn small mint" type="submit">creations</button>
          </form>
          <form action={setComp} className="inline-form">
            <input type="hidden" name="id" value={id} />
            <span>Free access:</span>
            <select name="tier" defaultValue={isPaidTier(p.comp_tier) ? p.comp_tier : "none"} aria-label="Free access plan">
              <option value="none">None</option>
              {PAID_TIERS.map((t) => (
                <option key={t} value={t}>{PLANS[t].name}</option>
              ))}
            </select>
            <button className="big-btn small plain" type="submit">Save</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <h2>Their cards ({cards?.length ?? 0}{cards?.length === 60 ? "+" : ""})</h2>
        <p className="hint">Restoring a card gives the creation back. The card itself stays in their account.</p>
        <div className="admin-cards">
          {(cards ?? []).map((c) => (
            <div key={c.id} className={`admin-card${c.refunded ? " refunded" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image_url ? <img src={c.image_url} alt="" /> : <div className="noimg" />}
              <b>{(c.card as { name?: string })?.name}</b>
              <span>{c.kind} · {when(c.created_at)}</span>
              <span>
                {c.status === "deleted" ? "thrown away" : c.status}
                {Number(c.pictures) > 1 ? ` · ${String(c.pictures)} pictures` : ""}
              </span>
              <form action={setRestored}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="creation" value={c.id} />
                <input type="hidden" name="restore" value={c.refunded ? "0" : "1"} />
                <button className="text-btn" type="submit">{c.refunded ? "Restored · undo" : "Restore this creation"}</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Their activity</h2>
        <ActivityTable rows={activity ?? []} emailOf={new Map([[id, p.email]])} />
      </section>
    </>
  );
}
