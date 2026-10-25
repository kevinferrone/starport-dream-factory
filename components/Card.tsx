import type { Kind } from "@/lib/options";
import { KINDS } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import { cardPieces, wordOffsets, words, type Piece } from "@/lib/card-text";

/** Text split into word spans so the read-aloud can highlight each one. */
function Words({ text, start, highlight }: { text: string; start: number; highlight: number | null }) {
  return (
    <>
      {words(text).map((w, i) => (
        <span key={i} className={start + i === highlight ? "w on" : "w"}>
          {w}{" "}
        </span>
      ))}
    </>
  );
}

/** The printable trading card. Pure display, safe for server or client. */
export default function Card({
  kind,
  card,
  imageUrl,
  highlight = null,
}: {
  kind: Kind;
  card: AnyCard;
  imageUrl: string | null;
  highlight?: number | null;
}) {
  const pieces = cardPieces(kind, card);
  const offsets = wordOffsets(pieces);
  const at = (i: number) => <Words text={pieces[i].text} start={offsets[i]} highlight={highlight} />;

  // Group the body pieces into the card's layout.
  const chips: number[] = [];
  const body: React.ReactNode[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p: Piece = pieces[i];
    if (p.role === "title") continue;
    if (p.role === "desc") body.push(<p className="desc" key={i}>{at(i)}</p>);
    else if (p.role === "chip") chips.push(i);
    else if (p.role === "ruleName") {
      const next = pieces[i + 1];
      const hasText = next && (next.role === "ruleText" || next.role === "note");
      body.push(
        <p className={`rule${next?.role === "note" ? " small" : ""}`} key={i}>
          <strong>{at(i)}</strong>
          {hasText && at(i + 1)}
        </p>
      );
      if (hasText) i++;
    } else if (p.role === "ruleText") body.push(<p className="rule" key={i}>{at(i)}</p>);
    else if (p.role === "note") body.push(<p className="rule small" key={i}>{at(i)}</p>);
  }
  // Chips sit right after the description.
  const chipRow = (
    <div className="chips" key="chips">
      {chips.map((i) => (
        <span className="chip" key={i}>
          <span aria-hidden>{pieces[i].icon}</span>
          <span className="chip-text">{at(i)}</span>
        </span>
      ))}
    </div>
  );
  body.splice(1, 0, chipRow);

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
          <h3>{at(0)}</h3>
          <span className="kindmark" aria-label={KINDS[kind].title}>{KINDS[kind].icon}</span>
        </div>
        <div className="body">{body}</div>
        <div className="foot">Starport Dream Factory</div>
      </div>
    </article>
  );
}
