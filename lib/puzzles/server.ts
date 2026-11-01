// Loads a family's Puzzle Lab state: points, rank, badges, unlocks and their cards.
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnyCard } from "@/lib/generate";
import { earnedBadges, gradeFromReadingLevel, rankInfo, unlocks, type KindStats, type PuzzleKind } from "./progress";
import type { CardWord } from "./wordsearch";

export async function puzzleState(userId: string) {
  const db = createAdminClient();
  const [solvesRes, rowsRes, cardsRes, profileRes] = await Promise.all([
    db.from("puzzle_solves").select("kind, grade, points").eq("user_id", userId),
    // Every card row ever made (deleting only hides a card), so unlocks never go away.
    db.from("creations").select("kind").eq("user_id", userId),
    db
      .from("creations")
      .select("id, kind, card, image_url")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("profiles").select("reading_level").eq("id", userId).single(),
  ]);

  const solves = solvesRes.error ? [] : (solvesRes.data ?? []);
  const stats: Partial<Record<PuzzleKind, KindStats>> = {};
  let points = 0;
  for (const s of solves) {
    const k = s.kind as PuzzleKind;
    const st = (stats[k] ??= { solved: 0, topGrade: 0 });
    st.solved++;
    st.topGrade = Math.max(st.topGrade, s.grade);
    points += s.points;
  }

  const rows = rowsRes.data ?? [];
  const build = { total: rows.length, kinds: new Set(rows.map((r) => r.kind as string)) };

  const cards: CardWord[] = (cardsRes.data ?? []).map((c) => ({
    cardId: c.id as string,
    name: (c.card as AnyCard)?.name ?? "",
    imageUrl: (c.image_url as string | null) ?? null,
    kind: c.kind as string,
  }));

  return {
    points,
    rank: rankInfo(points),
    stats,
    badges: earnedBadges(stats),
    unlocks: unlocks(build),
    build,
    cards,
    startGrade: gradeFromReadingLevel(profileRes.data?.reading_level),
    ready: !solvesRes.error, // false until the puzzles table exists
  };
}
