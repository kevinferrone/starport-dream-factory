import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puzzleState } from "@/lib/puzzles/server";
import WordSearch from "@/components/puzzles/WordSearch";

export const dynamic = "force-dynamic";

export default async function WordSearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const s = await puzzleState(user.id);
  if (!s.ready || !s.unlocks.wordsearch.open) redirect("/puzzles");
  return (
    <>
      <section className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>
          <span aria-hidden>🔎</span> Creature word search
        </h1>
        <p>Find the names of your own cards! Drag across a word, or tap its first and last letter.</p>
      </section>
      <WordSearch cards={s.cards} startGrade={s.startGrade} />
    </>
  );
}
