import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess, RESTING_MESSAGE } from "@/lib/access";
import { KINDS, type Kind } from "@/lib/options";
import { SpeakingLink } from "@/components/ReadAloud";
import { KIND_SPOKEN } from "@/lib/voice-phrases";
import { STARPORT_URL, STARPORT_2E_URL } from "@/lib/site";

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

      <SpeakingLink href="/puzzles" label="Puzzle Lab" className="puzzle-banner">
        <span className="emoji" aria-hidden>🧩</span>
        <span>
          <strong>Puzzle Lab</strong>
          <span className="sub">Fun puzzles made from the cards you create</span>
        </span>
        <span aria-hidden>→</span>
      </SpeakingLink>

      <div className="meter">
        <span aria-hidden>⭐</span>
        <span>{access.resting ? RESTING_MESSAGE : access.summary}</span>
        {access.tier !== "unlimited" && <Link href="/plans">Get more</Link>}
      </div>

      <a className="sp2e-poster" href={STARPORT_2E_URL} target="_blank" rel="noopener noreferrer">
        <span className="sp2e-tag">For grown-ups</span>
        <span className="sp2e-text">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sp2e-logo" src="/starport-logo.png" alt="Starport" width={1200} height={267} />
          <span className="sp2e-ribbon">2nd Edition</span>
          <strong className="sp2e-head">Coming soon to Kickstarter</strong>
          <span className="sp2e-sub">
            New creatures, new adventures and brand-new art. No fighting, all wonder, for <span className="nowrap">ages 4–12</span>.
          </span>
          <span className="sp2e-btn">Join the launch list →</span>
        </span>
        <span className="sp2e-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sp2e-troll" src="/tiles/creature.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sp2e-flummox" src="/flummox.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sp2e-chatter" src="/tiles/pet.webp" alt="" />
        </span>
      </a>

      <p className="made-for">
        These cards are made for <strong>Starport</strong>, the tabletop roleplaying game.{" "}
        <a href={STARPORT_URL} target="_blank" rel="noopener noreferrer">
          Learn more →
        </a>
      </p>
    </>
  );
}
