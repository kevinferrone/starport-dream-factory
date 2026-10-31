import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sendMetaEvent } from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EmailLogin from "./EmailLogin";
import { setNewsOptIn } from "@/lib/news";

async function confirmParent(formData: FormData) {
  "use server";
  if (formData.get("parent") !== "yes") redirect("/login?step=parent&missing=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: before } = await createAdminClient().from("profiles").select("parent_confirmed").eq("id", user.id).single();
  await createAdminClient().from("profiles").update({ parent_confirmed: true }).eq("id", user.id);
  // Only an explicit yes changes anything; an unticked box never unsubscribes someone already on the list.
  if (formData.get("news") === "yes") await setNewsOptIn(user.id, user.email, true);
  // A new grown-up account, counted once.
  if (!before?.parent_confirmed) {
    const userAgent = (await headers()).get("user-agent");
    await sendMetaEvent({ name: "CompleteRegistration", email: user.email, userId: user.id, eventId: `reg-${user.id}`, userAgent });
  }
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ step?: string; missing?: string; error?: string }> }) {
  const { step, missing, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && step !== "parent") redirect("/");

  return (
    <>
      <section className="hero">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/starport-logo.png" alt="Starport" width={1200} height={267} />
          <span className="line2">Dream Factory</span>
        </h1>
        <p>Build your own creatures, equipment and pets for Starport.</p>
      </section>

      <section className="panel" style={{ maxWidth: 560, margin: "28px auto" }}>
        {error && !user && (
          <p className="error" role="alert">
            Sign-in didn&apos;t finish: {error}
          </p>
        )}
        {user ? (
          <form action={confirmParent} className="form">
            <h2>
              <span className="emoji" aria-hidden>🔑</span> One grown-up step
            </h2>
            <p className="hint">
              Dream Factory accounts belong to a parent or guardian. Kids build under your account, and
              we don&apos;t ask for anything about them.
            </p>
            {missing && <p className="error">Please tick the box to continue.</p>}
            <label className="check">
              <input type="checkbox" name="parent" value="yes" />
              <span>I&apos;m a parent or guardian, I&apos;m 18 or older, and I&apos;ll supervise the kids using this account.</span>
            </label>
            <label className="check">
              <input type="checkbox" name="news" value="yes" />
              <span>
                Email me Starport news, including when Starport 2nd Edition launches on Kickstarter. About once a month;
                unsubscribe anytime. (Optional)
              </span>
            </label>
            <button className="big-btn small" type="submit">
              <span className="emoji" aria-hidden>🚀</span> Let&apos;s build
            </button>
          </form>
        ) : (
          <EmailLogin />
        )}
      </section>
    </>
  );
}
