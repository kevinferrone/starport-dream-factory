// Draws the card straight into a PDF (no screenshot), so nothing gets cut off.
import { jsPDF } from "jspdf";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import { cardPieces } from "@/lib/card-text";

const FRAME: Record<Kind, string> = { creature: "#ff8a3d", equipment: "#9b7bff", pet: "#2ed9a3" };
const INK = "#23205a";
const SOFT = "#5b588f";
const CHIP = "#f1efff";

const W = 300; // card width in points (about 4.2 inches)
const FRAME_W = 10;
const INNER_W = W - FRAME_W * 2;
const PAD = 14;
const TEXT_W = INNER_W - PAD * 2;

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Emoji aren't in the PDF's built-in font, so leave them out. */
const clean = (s: string) =>
  s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+/g, " ").trim();

/** Lays the card out at (x0, y0). When draw is false it only measures. Returns the height. */
function layout(doc: jsPDF, kind: Kind, card: AnyCard, image: string | null, x0: number, y0: number, draw: boolean) {
  const pieces = cardPieces(kind, card);
  const ix = x0 + FRAME_W;
  let y = y0 + FRAME_W;

  if (draw && image) doc.addImage(image, "PNG", ix, y, INNER_W, INNER_W);
  y += INNER_W;

  // Name banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(clean(pieces[0].text), INNER_W - 24);
  const bannerH = 14 + titleLines.length * 19;
  if (draw) {
    doc.setFillColor(FRAME[kind]);
    doc.rect(ix, y, INNER_W, bannerH, "F");
    doc.setTextColor(kind === "equipment" ? "#ffffff" : INK);
    doc.text(titleLines, ix + 12, y + 22);
  }
  y += bannerH + 12;

  const chips = pieces.filter((p) => p.role === "chip").map((p) => clean(p.text));

  for (const p of pieces) {
    if (p.role === "title" || p.role === "chip") continue;
    const t = clean(p.text);

    if (p.role === "desc") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(t, TEXT_W);
      if (draw) {
        doc.setTextColor(SOFT);
        doc.text(lines, ix + PAD, y + 10);
      }
      y += lines.length * 13.5 + 8;

      // Chips right under the description
      if (chips.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        let cx = ix + PAD;
        let rowY = y;
        for (const c of chips) {
          const w = doc.getTextWidth(c) + 18;
          if (cx + w > ix + PAD + TEXT_W) {
            cx = ix + PAD;
            rowY += 24;
          }
          if (draw) {
            doc.setFillColor(CHIP);
            doc.roundedRect(cx, rowY, w, 19, 9, 9, "F");
            doc.setTextColor(INK);
            doc.text(c, cx + 9, rowY + 13);
          }
          cx += w + 6;
        }
        y = rowY + 19 + 10;
      }
      continue;
    }

    const isName = p.role === "ruleName";
    const isNote = p.role === "note";
    doc.setFont("helvetica", isName ? "bold" : "normal");
    doc.setFontSize(isName ? 11.5 : isNote ? 9.5 : 10.5);
    const lines = doc.splitTextToSize(t, TEXT_W);
    const lh = isName ? 14 : isNote ? 12 : 13.5;
    if (draw) {
      doc.setTextColor(isNote ? SOFT : INK);
      doc.text(lines, ix + PAD, y + 10);
    }
    y += lines.length * lh + (isName ? 1 : 7);
  }

  // Footer
  y += 6;
  if (draw) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(SOFT);
    doc.text("Starport Dream Factory", ix + INNER_W - PAD, y, { align: "right" });
  }
  y += 10 + FRAME_W;
  return y - y0;
}

export async function downloadCardPdf(kind: Kind, card: AnyCard, imageUrl: string | null) {
  const image = imageUrl ? await toDataUrl(imageUrl) : null;

  // Measure first, then use a letter page (or a taller page for a very wordy card).
  const h = layout(new jsPDF({ unit: "pt", format: "letter" }), kind, card, image, 0, 0, false);
  const fitsLetter = h <= 792 - 72;
  const doc = new jsPDF({ unit: "pt", format: fitsLetter ? "letter" : [W + 72, h + 72] });
  const pageW = fitsLetter ? 612 : W + 72;
  const x0 = (pageW - W) / 2;
  const y0 = 36;

  doc.setFillColor(FRAME[kind]);
  doc.roundedRect(x0, y0, W, h, 18, 18, "F");
  doc.setFillColor("#ffffff");
  doc.roundedRect(x0 + FRAME_W, y0 + FRAME_W, INNER_W, h - FRAME_W * 2, 12, 12, "F");
  layout(doc, kind, card, image, x0, y0, true);

  doc.save(`${clean(card.name).replace(/[^a-z0-9]+/gi, "-") || "card"}.pdf`);
}
