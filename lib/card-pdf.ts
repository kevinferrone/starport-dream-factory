// Draws cards straight into a PDF (no screenshot), so nothing gets cut off.
// One card per page, or a print sheet with 6 cards per page (2 rows of 3).
import { jsPDF } from "jspdf";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import { cardPieces } from "@/lib/card-text";

const FRAME: Record<Kind, string> = { creature: "#ff8a3d", equipment: "#9b7bff", pet: "#2ed9a3" };
const INK = "#23205a";
const SOFT = "#5b588f";
const CHIP = "#f1efff";

type Img = { data: string; w: number; h: number };
export type SheetCard = { kind: Kind; card: AnyCard; imageUrl: string | null };

/** Loads any image (PNG, WebP…) and turns it into a PNG the PDF can use. */
async function loadImage(url: string): Promise<Img | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const max = 900; // plenty for print, keeps the file small
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

const badgeCache: Partial<Record<Kind, Promise<Img | null>>> = {};
const badge = (kind: Kind) => (badgeCache[kind] ??= loadImage(`/tiles/${kind}.webp`));

/** Emoji aren't in the PDF's built-in font, so leave them out. */
const clean = (s: string) =>
  s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+/g, " ").trim();

/**
 * Lays one card out at (x0, y0), W points wide. `g` scales the frame and spacing,
 * `f` scales the text. When draw is false it only measures. Returns the height.
 */
function layout(
  doc: jsPDF,
  item: { kind: Kind; card: AnyCard; art: Img | null; mark: Img | null },
  x0: number,
  y0: number,
  W: number,
  f: number,
  draw: boolean
) {
  const g = W / 300;
  const { kind, card, art, mark } = item;
  const pieces = cardPieces(kind, card);
  const frame = 10 * g;
  const innerW = W - frame * 2;
  const pad = 14 * g;
  const textW = innerW - pad * 2;
  const ix = x0 + frame;
  let y = y0 + frame;

  // Picture
  if (draw && art) doc.addImage(art.data, "PNG", ix, y, innerW, innerW);
  y += innerW;

  // Name banner with the kind's picture on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17 * f);
  const markW = 34 * g;
  const titleLines = doc.splitTextToSize(clean(pieces[0].text), innerW - 24 * g - markW);
  const lineH = 19 * f;
  const bannerH = Math.max(14 * g + titleLines.length * lineH, markW + 8 * g);
  if (draw) {
    doc.setFillColor(FRAME[kind]);
    doc.rect(ix, y, innerW, bannerH, "F");
    doc.setTextColor(kind === "equipment" ? "#ffffff" : INK);
    doc.text(titleLines, ix + 12 * g, y + (bannerH - titleLines.length * lineH) / 2 + lineH * 0.78);
    if (mark) {
      const s = Math.min(markW / mark.w, (bannerH - 6 * g) / mark.h);
      const mw = mark.w * s;
      const mh = mark.h * s;
      doc.addImage(mark.data, "PNG", ix + innerW - 8 * g - mw, y + (bannerH - mh) / 2, mw, mh);
    }
  }
  y += bannerH + 12 * g;

  const chips = pieces.filter((p) => p.role === "chip").map((p) => clean(p.text));

  for (const p of pieces) {
    if (p.role === "title" || p.role === "chip") continue;
    const t = clean(p.text);

    if (p.role === "desc") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10.5 * f);
      const lines = doc.splitTextToSize(t, textW);
      if (draw) {
        doc.setTextColor(SOFT);
        doc.text(lines, ix + pad, y + 10 * f);
      }
      y += lines.length * 13.5 * f + 8 * g;

      if (chips.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10 * f);
        const chipH = 19 * f;
        let cx = ix + pad;
        let rowY = y;
        for (const c of chips) {
          const w = doc.getTextWidth(c) + 18 * f;
          if (cx + w > ix + pad + textW) {
            cx = ix + pad;
            rowY += chipH + 5 * g;
          }
          if (draw) {
            doc.setFillColor(CHIP);
            doc.roundedRect(cx, rowY, w, chipH, chipH / 2, chipH / 2, "F");
            doc.setTextColor(INK);
            doc.text(c, cx + 9 * f, rowY + chipH * 0.68);
          }
          cx += w + 6 * g;
        }
        y = rowY + chipH + 10 * g;
      }
      continue;
    }

    const isName = p.role === "ruleName";
    const isNote = p.role === "note";
    doc.setFont("helvetica", isName ? "bold" : "normal");
    doc.setFontSize((isName ? 11.5 : isNote ? 9.5 : 10.5) * f);
    const lines = doc.splitTextToSize(t, textW);
    const lh = (isName ? 14 : isNote ? 12 : 13.5) * f;
    if (draw) {
      doc.setTextColor(isNote ? SOFT : INK);
      doc.text(lines, ix + pad, y + 10 * f);
    }
    y += lines.length * lh + (isName ? 1 : 7) * g;
  }

  // Footer
  y += 6 * g;
  if (draw) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8 * f);
    doc.setTextColor(SOFT);
    doc.text("Starport Dream Factory", ix + innerW - pad, y + 4 * f, { align: "right" });
  }
  y += 10 * g + frame;
  return y - y0;
}

function drawCard(
  doc: jsPDF,
  item: { kind: Kind; card: AnyCard; art: Img | null; mark: Img | null },
  x0: number,
  y0: number,
  W: number,
  f: number,
  h: number
) {
  const g = W / 300;
  const frame = 10 * g;
  doc.setFillColor(FRAME[item.kind]);
  doc.roundedRect(x0, y0, W, h, 18 * g, 18 * g, "F");
  doc.setFillColor("#ffffff");
  doc.roundedRect(x0 + frame, y0 + frame, W - frame * 2, h - frame * 2, 12 * g, 12 * g, "F");
  layout(doc, item, x0, y0, W, f, true);
}

const fileName = (s: string) => `${clean(s).replace(/[^a-z0-9]+/gi, "-") || "cards"}.pdf`;

/** One card, centered on a letter page. */
export async function downloadCardPdf(kind: Kind, card: AnyCard, imageUrl: string | null) {
  const [art, mark] = await Promise.all([imageUrl ? loadImage(imageUrl) : null, badge(kind)]);
  const item = { kind, card, art, mark };
  const W = 300;
  const h = layout(new jsPDF({ unit: "pt", format: "letter" }), item, 0, 0, W, 1, false);
  const fits = h <= 792 - 72;
  const doc = new jsPDF({ unit: "pt", format: fits ? "letter" : [W + 72, h + 72] });
  const pageW = fits ? 612 : W + 72;
  drawCard(doc, item, (pageW - W) / 2, 36, W, 1, h);
  doc.save(fileName(card.name));
}

/** A print sheet: 6 cards per letter page, 2 rows of 3, in the order given. */
export async function downloadSheetPdf(cards: SheetCard[], name: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
  const margin = 30;
  const gap = 14;
  const W = (612 - margin * 2 - gap * 2) / 3; // ≈ 175pt (about 2.4 inches)
  const cellH = (792 - margin * 2 - gap) / 2; // ≈ 359pt

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (i > 0 && i % 6 === 0) doc.addPage();
    const slot = i % 6;
    const x0 = margin + (slot % 3) * (W + gap);
    const y0 = margin + Math.floor(slot / 3) * (cellH + gap);

    const [art, mark] = await Promise.all([c.imageUrl ? loadImage(c.imageUrl) : null, badge(c.kind)]);
    const item = { kind: c.kind, card: c.card, art, mark };

    // Start with readable text and shrink only if a wordy card would overflow its spot.
    let f = 0.72;
    let h = layout(doc, item, 0, 0, W, f, false);
    while (h > cellH && f > 0.42) {
      f -= 0.04;
      h = layout(doc, item, 0, 0, W, f, false);
    }
    drawCard(doc, item, x0, y0, W, f, Math.min(h, cellH));
  }
  doc.save(fileName(name));
}
