import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, RESTING_MESSAGE } from "@/lib/access";
import { KINDS, type Kind } from "@/lib/options";
import { SpeakingLink } from "@/components/ReadAloud";
import { KIND_SPOKEN } from "@/lib/voice-phrases";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getAccess(user.id);
  if (!access.parentConfirmed) redirect("/login?step=parent");

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="tile-art" src={`/tiles/${kind}.webp`} alt="" aria-hidden />
            {k.title}
          </SpeakingLink>
        ))}
      </nav>

      <div className="meter">
        <span aria-hidden>⭐</span>
        <span>{access.resting ? RESTING_MESSAGE : access.summary}</span>
        {access.tier !== "unlimited" && <Link href="/plans">Get more</Link>}
      </div>
    </>
  );
}
