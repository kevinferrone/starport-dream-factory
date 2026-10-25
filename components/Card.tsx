import type { Kind } from "@/lib/options";
import { KINDS } from "@/lib/options";
import type { CreatureCard, EquipmentCard, PetCard, AnyCard } from "@/lib/generate";

/** The printable trading card. Pure display, safe for server or client. */
export default function Card({ kind, card, imageUrl }: { kind: Kind; card: AnyCard; imageUrl: string | null }) {
  return (
    <article className={`tcard ${kind}`} id="the-card">
      <div className="inner">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="art" src={imageUrl} alt={card.name} crossOrigin="anonymous" />
        ) : (
          <div className="art" />
        )}
        <div className="banner">
          <h3>{card.name}</h3>
          <span className="kindmark" aria-label={KINDS[kind].title}>{KINDS[kind].icon}</span>
        </div>
        <div className="body">
          <p className="desc">{card.description}</p>
          {kind === "creature" && <CreatureBody c={card as CreatureCard} />}
          {kind === "equipment" && <EquipmentBody e={card as EquipmentCard} />}
          {kind === "pet" && <PetBody p={card as PetCard} />}
        </div>
        <div className="foot">Starport Dream Factory</div>
      </div>
    </article>
  );
}

function CreatureBody({ c }: { c: CreatureCard }) {
  return (
    <>
      <div className="chips">
        <span className="chip">🎯 Difficulty <b>{c.difficulty}</b></span>
        <span className="chip">⭐ Successes to defeat <b>{c.successes}</b></span>
      </div>
      {c.abilities.map((a) => (
        <p className="rule" key={a.name}>
          <strong>{a.name}</strong>
          {a.effect}
        </p>
      ))}
      <p className="rule">
        <strong>Special: {c.special.name}</strong>
        {c.special.effect}
      </p>
    </>
  );
}

function EquipmentBody({ e }: { e: EquipmentCard }) {
  return (
    <>
      <div className="chips">
        <span className="chip">🪙 Cost <b>{e.cost}</b> {e.cost === 1 ? "Coin" : "Coins"}</span>
        <span className="chip">{e.type === "consumable" ? "✰ One-time use" : "♾️ Keep forever"}</span>
      </div>
      <p className="rule">{e.effect}</p>
      <p className="rule" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        {e.uses_turn ? "Using this item takes your turn." : "Using this item does not take your turn."}
      </p>
    </>
  );
}

function PetBody({ p }: { p: PetCard }) {
  return (
    <>
      <div className="chips">
        <span className="chip">🪙 Cost <b>{p.cost}</b> {p.cost === 1 ? "Coin" : "Coins"}</span>
      </div>
      <p className="rule">
        <strong>Bonus</strong>
        {p.bonuses}
      </p>
      <p className="rule">
        <strong>{p.power.name}</strong>
        {p.power.effect}
      </p>
      <p className="rule" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        <strong style={{ fontSize: 14 }}>For the Guide</strong>
        {p.roleplay}
      </p>
    </>
  );
}
