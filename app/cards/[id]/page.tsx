import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MAX_REROLLS_PER_CARD } from "@/lib/access";
import CardActions from "@/components/CardActions";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("creations").select("*").eq("id", id).single(),
    supabase.from("profiles").select("reading_level").eq("id", user.id).single(),
  ]);
  if (!data) notFound();

  return (
    <CardActions
      id={data.id}
      kind={data.kind as Kind}
      card={data.card as AnyCard}
      imageUrl={data.image_url}
      saved={data.status === "saved"}
      rerollsLeft={Math.max(0, MAX_REROLLS_PER_CARD - data.reroll_count)}
      readingLevel={profile?.reading_level ?? null}
      reveal={isNew === "1"}
    />
  );
}
