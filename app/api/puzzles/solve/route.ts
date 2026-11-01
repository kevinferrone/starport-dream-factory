import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { puzzleState } from "@/lib/puzzles/server";
import { BADGES, PUZZLES, RANKS, pointsFor, rankInfo, type PuzzleKind } from "@/lib/puzzles/progress";

// Records a solved puzzle. Returns points, any new badges, and a rank-up (with its bonus creation).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; grade?: number; hints?: number; total?: number };
  const kind = body.kind as PuzzleKind;
  const grade = Math.round(Number(body.grade));
  const hints = Math.max(0, Math.min(100, Math.round(Number(body.hints) || 0)));
  const total = Math.max(0, Math.min(100, Math.round(Number(body.total) || 0)));
  if (!(kind in PUZZLES) || !(grade >= 1 && grade <= 7)) {
    return NextResponse.json({ error: "That puzzle doesn't look right." }, { status: 400 });
  }

  const before = await puzzleState(user.id);
  if (!before.ready) return NextResponse.json({ error: "Puzzles are almost ready. Please try again soon." }, { status: 503 });
  if (!before.unlocks[kind as "sudoku" | "wordsearch" | "codebreaker"]?.open) {
    return NextResponse.json({ error: "This puzzle isn't unlocked yet." }, { status: 403 });
  }

  const db = createAdminClient();
  // A generous daily cap keeps points honest without ever getting in a real kid's way.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from("puzzle_solves").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 80) {
    return NextResponse.json({ points: 0, totalPoints: before.points, rank: before.rank, rankUp: null, newBadges: [], capped: true });
  }

  const points = pointsFor(grade, hints, total);
  // Hints did most of the work: celebrate, but no points or badge progress.
  if (points === 0) {
    return NextResponse.json({ points: 0, totalPoints: before.points, rank: before.rank, rankUp: null, newBadges: [], helped: true });
  }
  const { error } = await db.from("puzzle_solves").insert({ user_id: user.id, kind, grade, hints, points });
  if (error) return NextResponse.json({ error: "Couldn't save that solve." }, { status: 500 });

  const totalPoints = before.points + points;
  const rank = rankInfo(totalPoints);
  let rankUp: { name: string; bonus: boolean } | null = null;
  if (rank.index > before.rank.index) {
    // Each rank above Cadet is worth one bonus creation, once.
    const { data: prof } = await db.from("profiles").select("bonus_creations").eq("id", user.id).single();
    const granted = Math.min(RANKS.length - 1, prof?.bonus_creations ?? 0);
    const bonus = rank.index > granted;
    if (bonus) await db.from("profiles").update({ bonus_creations: rank.index }).eq("id", user.id);
    rankUp = { name: rank.name, bonus };
  }

  const had = new Set(before.badges.map((b) => b.id));
  const st = { ...(before.stats[kind] ?? { solved: 0, topGrade: 0 }) };
  st.solved++;
  st.topGrade = Math.max(st.topGrade, grade);
  const newBadges = BADGES.filter((b) => b.kind === kind && !had.has(b.id) && b.test(st)).map((b) => b.name);

  return NextResponse.json({ points, totalPoints, rank, rankUp, newBadges });
}
