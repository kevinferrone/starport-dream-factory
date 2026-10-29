import Link from "next/link";
import CardsIcon from "@/components/CardsIcon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KINDS, type Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import SheetButton from "./SheetButton";

const ORDER: Kind[] = ["creature", "equipment", "pet"];

export default async function MyCards() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("creations")
    .select("id, kind, card, image_url")
    .eq("status", "saved")
    .order("saved_at", { ascending: false });

  const cards = (data ?? []).map((c) => ({
    id: c.id as string,
    kind: c.kind as Kind,
    card: c.card as AnyCard,
    imageUrl: (c.image_url as string | null) ?? null,
  }));
  const byKind = (k: Kind) => cards.filter((c) => c.kind === k);
  const sheet = (list: typeof cards) => list.map(({ kind, card, imageUrl }) => ({ kind, card, imageUrl }));
  // The "all cards" sheet keeps each kind together: creatures, then equipment, then pets.
  const everything = ORDER.flatMap(byKind);

  return (
    <>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <CardsIcon size={64} /> My cards
        </h1>
        {cards.length > 0 && (
          <div className="actions" style={{ marginTop: 14 }}>
            <SheetButton cards={sheet(everything)} name="My Starport cards" label="Print sheet of all my cards" />
          </div>
        )}
      </div>

      {!cards.length ? (
        <p className="empty">
          No saved cards yet. <Link href="/">Make your first one!</Link>
        </p>
      ) : (
        ORDER.map((k) => {
          const list = byKind(k);
          return (
            <section className="shelf" key={k}>
              <div className="shelf-head">
                <h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/tiles/${k}.webp`} alt="" aria-hidden />
                  {KINDS[k].title}
                  <span className="count">({list.length})</span>
                </h2>
                {list.length > 0 && (
                  <SheetButton cards={sheet(list)} name={`My Starport ${KINDS[k].title}`} label={`Print sheet of ${KINDS[k].title.toLowerCase()}`} />
                )}
              </div>
              {list.length ? (
                <div className="gallery">
                  {list.map((c) => (
                    <Link key={c.id} href={`/cards/${c.id}`} className={`mini ${c.kind}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imageUrl ?? ""} alt="" />
                      <span>{c.card.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="shelf-empty">
                  None yet. <Link href={`/build/${k}`}>Make one!</Link>
                </p>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
