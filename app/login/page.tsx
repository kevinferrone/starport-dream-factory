import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EmailLogin from "./EmailLogin";

async function confirmParent(formData: FormData) {
  "use server";
  if (formData.get("parent") !== "yes") redirect("/login?step=parent&missing=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await createAdminClient().from("profiles").update({ parent_confirmed: true }).eq("id", user.id);
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ step?: string; missing?: string }> }) {
  const { step, missing } = await searchParams;
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
