import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puzzleState } from "@/lib/puzzles/server";
import BadgeShelf from "@/components/puzzles/BadgeShelf";
import { SpeakingLink } from "@/components/ReadAloud";

export const dynamic = "force-dynamic";

export default async function PuzzleLab() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const s = await puzzleState(user.id);
  const u = s.unlocks;

  const tiles = [
    { id: "sudoku", href: "/puzzles/sudoku", title: "Sudoku", icon: "🧩", open: u.sudoku.open, progress: u.sudoku.progress },
    { id: "wordsearch", href: "/puzzles/word-search", title: "Word search", icon: "🔎", open: u.wordsearch.open, progress: u.wordsearch.progress },
    {
      id: "codebreaker",
      href: "",
      title: "Code breaker",
      icon: "🔐",
      open: false,
      progress: u.codebreaker.open ? "Coming soon!" : u.codebreaker.progress,
    },
  ];

  return (
    <>
      <section className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
          <span aria-hidden>🧩</span> Puzzle Lab
        </h1>
        <p>Solve Starport puzzles, earn badges, and rank up. Build more cards to unlock more puzzles!</p>
      </section>

      {!s.ready && <p className="error" style={{ textAlign: "center" }}>Puzzle Lab is almost ready. Please check back soon!</p>}

      <nav className="tiles puzzle-tiles" aria-label="Pick a puzzle">
        {tiles.map((t) =>
          t.open && s.ready ? (
            <SpeakingLink key={t.id} href={t.href} label={t.title} className={`tile puzzle ${t.id}`}>
              <span className="tile-icon" aria-hidden>{t.icon}</span>
              {t.title}
            </SpeakingLink>
          ) : (
            <div key={t.id} className={`tile puzzle ${t.id} locked`} aria-disabled="true">
              <span className="tile-icon" aria-hidden>{t.icon}</span>
              {t.title}
              <span className="lock-note">
                <span aria-hidden>🔒</span> {t.progress}
              </span>
            </div>
          )
        )}
      </nav>

      <BadgeShelf points={s.points} rank={s.rank} earned={s.badges} />

    </>
  );
}
