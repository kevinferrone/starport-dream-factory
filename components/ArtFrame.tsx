"use client";

import { useEffect, useRef, useState } from "react";
import { artRect, edgeColor, featherAxis, FEATHER, paintBackdrop, type ArtFit } from "@/lib/art-fit";

type Props = {
  src: string;
  alt: string;
  art?: ArtFit;
  /** When set, the picture can be dragged to choose which part shows (fill mode). */
  onMove?: (x: number, y: number) => void;
};

/** The card's picture, placed exactly the way the PDF places it. */
export default function ArtFrame({ src, alt, art, onMove }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [bg, setBg] = useState("#f4f2ff");
  const backdrop = useRef<HTMLCanvasElement>(null);
  const imgEl = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect = size && nat ? artRect(size.w, size.h, nat.w, nat.h, art) : null;
  const canMove = !!onMove && art?.fit === "fill";
  const whole = art?.fit !== "fill";

  // "Whole" mode: a soft blurred copy of the picture fills the frame behind it (same as the PDF).
  useEffect(() => {
    const c = backdrop.current, im = imgEl.current;
    if (!whole || !c || !im || !size || !nat) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    paintBackdrop(c.getContext("2d")!, im, nat.w, nat.h, c.width, c.height);
  }, [whole, size, nat]);
  const axis = whole && size && nat ? featherAxis(size.w, size.h, nat.w, nat.h) : null;
  const pct = `${FEATHER * 100}%`;
  const mask = axis
    ? `linear-gradient(${axis === "x" ? "to right" : "to bottom"}, transparent, #000 ${pct}, #000 calc(100% - ${pct}), transparent)`
    : undefined;

  const down = (e: React.PointerEvent) => {
    if (!canMove || !art) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: art.x, y: art.y };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !rect || !size || !onMove) return;
    // Moving the picture right shows more of its left side, so the spot moves the other way.
    const spareW = rect.width - size.w;
    const spareH = rect.height - size.h;
    const x = spareW > 1 ? d.x - ((e.clientX - d.px) / spareW) * 100 : d.x;
    const y = spareH > 1 ? d.y - ((e.clientY - d.py) / spareH) * 100 : d.y;
    onMove(Math.round(Math.min(100, Math.max(0, x))), Math.round(Math.min(100, Math.max(0, y))));
  };
  const up = () => {
    drag.current = null;
  };

  return (
    <div
      ref={box}
      className={`art${canMove ? " movable" : ""}`}
      style={{ background: art?.fit === "fill" ? undefined : bg }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {whole && <canvas ref={backdrop} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgEl}
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        draggable={false}
        onLoad={(e) => {
          const im = e.currentTarget;
          setNat({ w: im.naturalWidth, h: im.naturalHeight });
          setBg(edgeColor(im, im.naturalWidth, im.naturalHeight));
        }}
        style={
          rect
            ? { position: "absolute", left: rect.left, top: rect.top, width: rect.width, height: rect.height, maxWidth: "none", maskImage: mask, WebkitMaskImage: mask }
            : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }
        }
      />
      {canMove && <span className="art-hint">Drag to move</span>}
    </div>
  );
}
