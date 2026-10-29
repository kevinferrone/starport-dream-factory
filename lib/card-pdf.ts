// Draws cards straight into a PDF (no screenshot), so nothing gets cut off.
// Cards are tarot size (2.75 x 4.75 in): one per page, or 6 per letter page (2 rows of 3).
import { jsPDF } from "jspdf";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import { cardPieces } from "@/lib/card-text";

const FRAME: Record<Kind, string> = { creature: "#ff8a3d", equipment: "#9b7bff", pet: "#2ed9a3" };
const INK = "#23205a";
const SOFT = "#5b588f";
const CHIP = "#f1efff";

type Img = { data: string; w: number; h: number; src?: HTMLCanvasElement; crops?: Record<string, string> };
export type SheetCard = { kind: Kind; card: AnyCard; imageUrl: string | null };

/** Tarot size: 2.75 x 4.75 inches (72 points per inch). */
export const CARD_W = 198;
export const CARD_H = 342;

/** Loads any image (PNG, WebP…) and turns it into something the PDF can use. */
async function loadImage(url: string, photo = false): Promise<Img | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const max = photo ? 1000 : 300; // plenty for a 2.75in card at print quality
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const data = photo ? canvas.toDataURL("image/jpeg", 0.9) : canvas.toDataURL("image/png");
    return { data, w: canvas.width, h: canvas.height, src: photo ? canvas : undefined, crops: {} };
  } catch {
    return null;
  }
}

/** The picture trimmed from the top and bottom to a shorter shape (r = height / width). */
function cropped(img: Img, r: number): string {
  if (!img.src || r >= img.h / img.w - 0.001) return img.data;
  const key = r.toFixed(2);
  if (img.crops![key]) return img.crops![key];
  const h = Math.round(img.w * r);
  const c = document.createElement("canvas");
  c.width = img.w;
  c.height = h;
  c.getContext("2d")!.drawImage(img.src, 0, (img.h - h) / 2, img.w, h, 0, 0, img.w, h);
  return (img.crops![key] = c.toDataURL("image/jpeg", 0.9));
}

const badgeCache: Partial<Record<Kind, Promise<Img | null>>> = {};
const badge = (kind: Kind) => (badgeCache[kind] ??= loadImage(`/tiles/${kind}.webp`));

/** Emoji aren't in the PDF's built-in font, so leave them out. */
const clean = (s: string) =>
  s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+/g, " ").trim();

type Item = { kind: Kind; card: AnyCard; art: Img | null; mark: Img | null };

/**
 * Lays one card out at (x0, y0), W points wide. `f` scales the text and `r` is the
 * picture's height as a share of its width. When draw is false it only measures.
 * Returns how far down the words reach.
 */
function layout(doc: jsPDF, item: Item, x0: number, y0: number, W: number, f: number, r: number, draw: boolean) {
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
  const artH = innerW * r;
  if (draw && art) doc.addImage(cropped(art, r), "JPEG", ix, y, innerW, artH);
  y += artH;

  // Name banner with the kind's picture on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17 * f);
  const markW = 34 * g;
  const titleLines = doc.splitTextToSize(clean(pieces[0].text), innerW - 24 * g - markW);
  const lineH = 19 * f;
  const bannerH = Math.max(12 * g + titleLines.length * lineH, markW + 8 * g);
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
  y += bannerH + 10 * g;

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
      y += lines.length * 13 * f + 6 * g;

      if (chips.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10 * f);
        const chipH = 18 * f;
        let cx = ix + pad;
        let rowY = y;
        for (const c of chips) {
          const w = doc.getTextWidth(c) + 16 * f;
          if (cx + w > ix + pad + textW) {
            cx = ix + pad;
            rowY += chipH + 4 * g;
          }
          if (draw) {
            doc.setFillColor(CHIP);
            doc.roundedRect(cx, rowY, w, chipH, chipH / 2, chipH / 2, "F");
            doc.setTextColor(INK);
            doc.text(c, cx + 8 * f, rowY + chipH * 0.68);
          }
          cx += w + 5 * g;
        }
        y = rowY + chipH + 8 * g;
      }
      continue;
    }

    const isName = p.role === "ruleName";
    const isNote = p.role === "note";
    doc.setFont("helvetica", isName ? "bold" : "normal");
    doc.setFontSize((isName ? 11.5 : isNote ? 9.5 : 10.5) * f);
    const lines = doc.splitTextToSize(t, textW);
    const lh = (isName ? 13.5 : isNote ? 11.5 : 13) * f;
    if (draw) {
      doc.setTextColor(isNote ? SOFT : INK);
      doc.text(lines, ix + pad, y + 10 * f);
    }
    y += lines.length * lh + (isName ? 1 : 6) * g;
  }
  return y - y0;
}

/** Room the footer needs under the words. */
const footRoom = (W: number, f: number) => (W / 300) * 24 + 8 * f;

/**
 * Finds the biggest picture and text that fit the card: the picture gets shorter
 * first (down to about 2/3 of square), then the words shrink a little,
 * then the picture a bit more, then the words again.
 */
const FITS: [number, number][] = [
  [1, 1], [0.9, 1], [0.8, 1], [0.7, 1], [0.62, 1], [0.62, 0.94], [0.62, 0.88],
  [0.55, 0.88], [0.55, 0.82], [0.55, 0.77], [0.55, 0.72], [0.55, 0.67], [0.5, 0.62],
];
function fit(doc: jsPDF, item: Item, W: number, H: number) {
  const base = 0.82; // text size for a tarot card
  for (const [r, s] of FITS) {
    const f = base * s;
    if (layout(doc, item, 0, 0, W, f, r, false) + footRoom(W, f) <= H) return { f, r };
  }
  // Very wordy (older) cards: keep shrinking until everything fits, never spill off the card.
  let r = 0.5;
  let f = base * FITS[FITS.length - 1][1];
  while (f > 0.3) {
    r = Math.max(0.4, r - 0.03);
    f -= 0.02;
    if (layout(doc, item, 0, 0, W, f, r, false) + footRoom(W, f) <= H) break;
  }
  return { f, r };
}

/** Draws one tarot card with its top-left corner at (x0, y0). */
function drawCard(doc: jsPDF, item: Item, x0: number, y0: number) {
  const W = CARD_W;
  const H = CARD_H;
  const g = W / 300;
  const frame = 10 * g;
  const { f, r } = fit(doc, item, W, H);
  // Square outer edge so it cuts cleanly; the colored frame runs right to the edge.
  doc.setFillColor(FRAME[item.kind]);
  doc.rect(x0, y0, W, H, "F");
  doc.setFillColor("#ffffff");
  doc.roundedRect(x0 + frame, y0 + frame, W - frame * 2, H - frame * 2, 12 * g, 12 * g, "F");
  layout(doc, item, x0, y0, W, f, r, true);
  // Footer, pinned to the bottom of the card
  doc.setFont("helvetica", "bold");
  doc.setTextColor(SOFT);
  // Points players to the full game. Shrinks if needed so it never runs past the card's inner edge.
  const foot = "Play it in Starport · widerpathgames.com";
  const room = W - frame * 2 - 28 * g;
  let size = 8 * f;
  doc.setFontSize(size);
  while (doc.getTextWidth(foot) > room && size > 5) {
    size -= 0.25;
    doc.setFontSize(size);
  }
  doc.text(foot, x0 + W - frame - 14 * g, y0 + H - frame - 7 * g, { align: "right" });
}

const fileName = (s: string) => `${clean(s).replace(/[^a-z0-9]+/gi, "-") || "cards"}.pdf`;

async function itemFor(kind: Kind, card: AnyCard, imageUrl: string | null): Promise<Item> {
  const [art, mark] = await Promise.all([imageUrl ? loadImage(imageUrl, true) : null, badge(kind)]);
  return { kind, card, art, mark };
}

/** One card on a page exactly the size of a tarot card (2.75 x 4.75 in), ready for a print shop. */
async function cardDoc(kind: Kind, card: AnyCard, imageUrl: string | null) {
  const doc = new jsPDF({ unit: "pt", format: [CARD_W, CARD_H] });
  drawCard(doc, await itemFor(kind, card, imageUrl), 0, 0);
  return doc;
}

export async function downloadCardPdf(kind: Kind, card: AnyCard, imageUrl: string | null) {
  (await cardDoc(kind, card, imageUrl)).save(fileName(card.name));
}

/**
 * Print: opens the tarot-size card in a new tab with the print window ready.
 * `win` must be opened during the click, or browsers block it.
 */
export async function printCard(win: Window | null, kind: Kind, card: AnyCard, imageUrl: string | null) {
  const doc = await cardDoc(kind, card, imageUrl);
  doc.autoPrint();
  const url = doc.output("bloburl").toString();
  if (win) win.location.href = url;
  else window.open(url, "_blank");
}

/**
 * A print sheet: 6 tarot cards per letter page, 2 rows of 3, edge to edge so each
 * cut serves two cards. Small marks in the margins show where to cut.
 */
export async function downloadSheetPdf(cards: SheetCard[], name: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
  const left = (612 - CARD_W * 3) / 2; // 9pt = 1/8 inch
  const top = (792 - CARD_H * 2) / 2; // 54pt = 3/4 inch

  const marks = () => {
    doc.setDrawColor("#9a97c4");
    doc.setLineWidth(0.5);
    for (let c = 0; c <= 3; c++) {
      const x = left + c * CARD_W;
      doc.line(x, top - 22, x, top - 6);
      doc.line(x, top + CARD_H * 2 + 6, x, top + CARD_H * 2 + 22);
    }
    for (let rI = 0; rI <= 2; rI++) {
      const y = top + rI * CARD_H;
      doc.line(0, y, left - 3, y);
      doc.line(612 - left + 3, y, 612, y);
    }
  };

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (i % 6 === 0) {
      if (i > 0) doc.addPage();
      marks();
    }
    const slot = i % 6;
    const x0 = left + (slot % 3) * CARD_W;
    const y0 = top + Math.floor(slot / 3) * CARD_H;
    drawCard(doc, await itemFor(c.kind, c.card, c.imageUrl), x0, y0);
  }
  doc.save(fileName(name));
}
