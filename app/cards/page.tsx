import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyCards() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cards } = await supabase
    .from("creations")
    .select("id, kind, card, image_url")
    .eq("status", "saved")
    .order("saved_at", { ascending: false });

  return (
    <>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>
          <span aria-hidden>🗂️</span> My cards
        </h1>
      </div>
      {!cards?.length ? (
        <p className="empty">
          No saved cards yet. <Link href="/">Make your first one!</Link>
        </p>
      ) : (
        <div className="gallery">
          {cards.map((c) => (
            <Link key={c.id} href={`/cards/${c.id}`} className={`mini ${c.kind}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image_url ?? ""} alt="" />
              <span>{(c.card as { name: string }).name}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
