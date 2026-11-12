import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { KINDS, fitChoices, type Kind } from "@/lib/options";
import Builder, { type BringCard } from "@/components/Builder";

export default async function BuildPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { kind } = await params;
  const { from } = await searchParams;
  if (!(kind in KINDS)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  if (!access.parentConfirmed) redirect("/login?step=parent");

  // "Change my buttons" — start from an earlier card's choices.
  let initial:
    | {
        choices: Record<string, string[]>;
        difficulty?: number;
        text?: string;
        drawingPath?: string;
        drawingUrl?: string;
        bring?: string[];
        heroName?: string;
      }
    | undefined;
  if (from) {
    const { data } = await supabase.from("creations").select("kind, choices, prompt_text").eq("id", from).single();
    if (data && data.kind === kind) {
      const { difficulty, drawing_path, bring, hero_name, ...rest } = data.choices as {
        difficulty?: number | null;
        drawing_path?: string | null;
        bring?: string[] | null;
        hero_name?: string | null;
        [k: string]: unknown;
      };
      initial = {
        choices: fitChoices(kind as Kind, rest as Record<string, string[]>),
        difficulty: difficulty ?? undefined,
        text: data.prompt_text ?? undefined,
        drawingPath: drawing_path ?? undefined,
        drawingUrl: drawing_path
          ? supabase.storage.from("card-images").getPublicUrl(drawing_path).data.publicUrl
          : undefined,
        bring: bring ?? undefined,
        heroName: hero_name ?? undefined,
      };
    }
  }

  // Characters: the kid's saved pets and equipment, to bring into the picture.
  let bringable: BringCard[] = [];
  if (kind === "character") {
    const { data } = await supabase
      .from("creations")
      .select("id, kind, card, image_url")
      .eq("user_id", user.id)
      .eq("status", "saved")
      .in("kind", ["pet", "equipment"])
      .order("saved_at", { ascending: false })
      .limit(60);
    bringable = (data ?? []).map((c) => ({
      id: c.id as string,
      kind: c.kind as "pet" | "equipment",
      name: String((c.card as { name?: string })?.name ?? ""),
      imageUrl: (c.image_url as string | null) ?? null,
    }));
  }

  return (
    <Builder
      kind={kind as Kind}
      initial={initial}
      remaining={access.remaining}
      resting={access.resting}
      bringable={bringable}
    />
  );
}
