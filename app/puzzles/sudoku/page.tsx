import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puzzleState } from "@/lib/puzzles/server";
import Sudoku from "@/components/puzzles/Sudoku";
import { STARTER_PICTURES as STARTERS } from "@/lib/puzzles/phrases";

export const dynamic = "force-dynamic";

export default async function SudokuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const s = await puzzleState(user.id);
  if (!s.ready || !s.unlocks.sudoku.open) redirect("/puzzles");
  const own = s.cards.filter((c) => c.imageUrl).slice(0, 4).map((c) => ({ src: c.imageUrl as string, name: c.name, cardId: c.cardId }));
  const pictures = [...own, ...STARTERS.filter((x) => !own.some((o) => o.src === x.src))].slice(0, 4);
  return (
    <>
      <section className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>
          <span aria-hidden>🧩</span> Sudoku
        </h1>
        <p>Tap a square, then pick what goes there.</p>
      </section>
      <Sudoku pictures={pictures} startGrade={s.startGrade} />
    </>
  );
}
