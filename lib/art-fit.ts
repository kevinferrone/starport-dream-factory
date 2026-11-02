// How a card's picture sits in its frame. Shared by the card on screen and the PDF,
// so what you see is exactly what prints.
//
// "whole": the entire picture always shows (nothing is ever cut off). Any leftover
//          room is filled with a soft, blurred, stretched copy of the picture's own
//          background, and the picture's edges fade into it, so there's no box edge.
// "fill":  the picture fills the frame edge to edge; the kid picks the zoom and
//          drags to choose which part shows.

export type ArtFit = { fit: "whole" | "fill"; x: number; y: number; zoom: number };

export const DEFAULT_ART: ArtFit = { fit: "whole", x: 50, y: 50, zoom: 1 };
export const ZOOM_MAX = 3;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Cleans whatever was sent in; anything odd falls back to "show the whole picture". */
export function cleanArt(v: unknown): ArtFit {
  const o = (v ?? {}) as Partial<Record<keyof ArtFit, unknown>>;
  const n = (x: unknown, lo: number, hi: number, d: number) => {
    const k = Number(x);
    return Number.isFinite(k) ? clamp(k, lo, hi) : d;
  };
  return {
    fit: o.fit === "fill" ? "fill" : "whole",
    x: Math.round(n(o.x, 0, 100, 50)),
    y: Math.round(n(o.y, 0, 100, 50)),
    zoom: Math.round(n(o.zoom, 1, ZOOM_MAX, 1) * 100) / 100,
  };
}

/** Where to draw a picture (iw x ih) inside a frame (W x H). May spill past the frame in "fill". */
export function artRect(W: number, H: number, iw: number, ih: number, art?: ArtFit | null) {
  const a = art ?? DEFAULT_ART;
  if (a.fit !== "fill") {
    const s = Math.min(W / iw, H / ih);
    const w = iw * s;
    const h = ih * s;
    return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
  }
  // Cover the frame, then zoom in around the chosen spot.
  const s = Math.max(W / iw, H / ih) * a.zoom;
  const w = iw * s;
  const h = ih * s;
  const px = a.x / 100;
  const py = a.y / 100;
  return { left: (W - w) * px, top: (H - h) * py, width: w, height: h };
}

/** The average color around the picture's edge: its background, for filling leftover room. */
export function edgeColor(src: CanvasImageSource, iw: number, ih: number): string {
  try {
    const n = 48;
    const c = document.createElement("canvas");
    c.width = n;
    c.height = n;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(src, 0, 0, iw, ih, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    let r = 0, g = 0, b = 0, k = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (x > 1 && x < n - 2 && y > 1 && y < n - 2) continue;
        const i = (y * n + x) * 4;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        k++;
      }
    }
    const hex = (v: number) => Math.round(v / k).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return "#ffffff";
  }
}

/** How far the picture's edges fade into the blurred background (share of its width or height). */
export const FEATHER = 0.08;

/**
 * Fills a W x H frame behind the picture: the picture's own outer edges are stretched out to the
 * frame's edges and blurred, so the background carries on smoothly past the picture.
 * (Shrinking to a few pixels and growing back in steps is a blur that works in every browser.)
 */
export function paintBackdrop(ctx: CanvasRenderingContext2D, src: CanvasImageSource, iw: number, ih: number, W: number, H: number) {
  ctx.fillStyle = edgeColor(src, iw, ih);
  ctx.fillRect(0, 0, W, H);
  try {
    const canvas = (w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.round(w));
      c.height = Math.max(2, Math.round(h));
      const cc = c.getContext("2d")!;
      cc.imageSmoothingEnabled = true;
      cc.imageSmoothingQuality = "high";
      return [c, cc] as const;
    };
    // Lay it out small: the picture where it sits, with its edge strips stretched into the gaps.
    const k = 96 / Math.max(W, H);
    const [lay, lc] = canvas(W * k, H * k);
    const lw = lay.width, lh = lay.height;
    const b = artRect(lw, lh, iw, ih);
    lc.drawImage(src, b.left, b.top, b.width, b.height);
    const e = 0.03; // the outer 3% of the picture is what gets stretched
    if (b.left > 0.5) {
      lc.drawImage(src, 0, 0, iw * e, ih, 0, b.top, b.left + 1, b.height);
      lc.drawImage(src, iw * (1 - e), 0, iw * e, ih, b.left + b.width - 1, b.top, lw - b.left - b.width + 1, b.height);
    }
    if (b.top > 0.5) {
      lc.drawImage(src, 0, 0, iw, ih * e, b.left, 0, b.width, b.top + 1);
      lc.drawImage(src, 0, ih * (1 - e), iw, ih * e, b.left, b.top + b.height - 1, b.width, lh - b.top - b.height + 1);
    }
    // Blur: shrink, then grow back in steps.
    const [s1, c1] = canvas(lw / 6, lh / 6);
    c1.drawImage(lay, 0, 0, s1.width, s1.height);
    const [s2, c2] = canvas(lw / 2, lh / 2);
    c2.drawImage(s1, 0, 0, s2.width, s2.height);
    const [s3, c3] = canvas(lw * 2, lh * 2);
    c3.drawImage(s2, 0, 0, s3.width, s3.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(s3, 0, 0, W, H);
  } catch {
    /* the plain background color stays */
  }
}

/** Which sides of the picture meet blurred background in "whole" mode. */
export function featherAxis(W: number, H: number, iw: number, ih: number): "x" | "y" | null {
  const gapX = W - iw * Math.min(W / iw, H / ih);
  const gapY = H - ih * Math.min(W / iw, H / ih);
  if (gapX > 1) return "x";
  if (gapY > 1) return "y";
  return null;
}

/** The whole picture on its blurred background, edges faded, drawn into a W x H canvas. */
export function paintWhole(ctx: CanvasRenderingContext2D, src: CanvasImageSource, iw: number, ih: number, W: number, H: number) {
  paintBackdrop(ctx, src, iw, ih, W, H);
  const b = artRect(W, H, iw, ih);
  const axis = featherAxis(W, H, iw, ih);
  if (!axis) {
    ctx.drawImage(src, b.left, b.top, b.width, b.height);
    return;
  }
  const t = document.createElement("canvas");
  t.width = Math.round(b.width);
  t.height = Math.round(b.height);
  const tc = t.getContext("2d")!;
  tc.drawImage(src, 0, 0, t.width, t.height);
  tc.globalCompositeOperation = "destination-in";
  const g = axis === "x" ? tc.createLinearGradient(0, 0, t.width, 0) : tc.createLinearGradient(0, 0, 0, t.height);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(FEATHER, "rgba(0,0,0,1)");
  g.addColorStop(1 - FEATHER, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  tc.fillStyle = g;
  tc.fillRect(0, 0, t.width, t.height);
  ctx.drawImage(t, b.left, b.top, b.width, b.height);
}
