"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A printable puzzle page (plus an answer key on page 2). It lives outside the page layout
 * and only shows when printing, so the browser's "Save as PDF" makes a clean sheet.
 */
export function PrintSheet({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;
  return createPortal(<div className="print-root">{children}</div>, host);
}

export function printPuzzle() {
  document.body.classList.add("print-puzzle");
  const done = () => {
    document.body.classList.remove("print-puzzle");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  // Give pictures a moment to be ready before the print dialog opens.
  setTimeout(() => window.print(), 50);
}

export function PrintButton() {
  return (
    <button className="big-btn small plain" type="button" onClick={printPuzzle}>
      <span className="emoji" aria-hidden>🖨️</span> Print
    </button>
  );
}

export function SheetHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="ps-head">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="ps-name">Name: ______________________</div>
    </header>
  );
}

export function SheetFooter() {
  return <footer className="ps-foot">Made with your own cards at starportdreamfactory.com · Starport, a roleplaying game for kids</footer>;
}
