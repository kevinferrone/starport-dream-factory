// How a card's picture sits in its frame. Shared by the card on screen and the PDF,
// so what you see is exactly what prints.
//
// "whole": the entire picture always shows (nothing is ever cut off). Any leftover
//          room is filled with the picture's own background color.
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
