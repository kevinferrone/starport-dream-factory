import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { KINDS, fitChoices, type Kind } from "@/lib/options";
import Builder from "@/components/Builder";

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
    | { choices: Record<string, string[]>; difficulty?: number; text?: string; drawingPath?: string; drawingUrl?: string }
    | undefined;
  if (from) {
    const { data } = await supabase.from("creations").select("kind, choices, prompt_text").eq("id", from).single();
    if (data && data.kind === kind) {
      const { difficulty, drawing_path, ...rest } = data.choices as {
        difficulty?: number | null;
        drawing_path?: string | null;
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
      };
    }
  }

  return <Builder kind={kind as Kind} initial={initial} remaining={access.remaining} />;
}
