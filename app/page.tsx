import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, PLANS } from "@/lib/access";
import { KINDS, type Kind } from "@/lib/options";
import { SpeakingLink } from "@/components/ReadAloud";
import { KIND_SPOKEN } from "@/lib/voice-phrases";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getAccess(user.id);
  if (!access.parentConfirmed) redirect("/login?step=parent");

  const plan = PLANS[access.tier];
  const kinds = Object.entries(KINDS) as [Kind, (typeof KINDS)[Kind]][];

  return (
    <>
      <section className="hero">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/starport-logo.png" alt="Starport" width={1200} height={267} />
          <span className="line2">Dream Factory</span>
        </h1>
        <p>Pick what you want to make. Press the buttons. Watch it come to life!</p>
      </section>

      <nav className="tiles" aria-label="What do you want to make?">
        {kinds.map(([kind, k]) => (
          <SpeakingLink key={kind} href={`/build/${kind}`} label={KIND_SPOKEN[kind]} className={`tile ${kind}`}>
            <span className="big" aria-hidden>{k.icon}</span>
            {k.title}
          </SpeakingLink>
        ))}
      </nav>

      <div className="meter">
        <span aria-hidden>⭐</span>
        <span>
          {access.remaining} of {plan.limit} creations left
          {plan.period === "month" ? " this month" : ""}
        </span>
        {access.tier !== "pro" && <a href="/plans">Get more</a>}
      </div>
    </>
  );
}
