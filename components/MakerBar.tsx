"use client";

import { usePathname } from "next/navigation";
import { KINDS, type Kind } from "@/lib/options";
import { KIND_SPOKEN } from "@/lib/voice-phrases";
import { SpeakingLink } from "@/components/ReadAloud";

/** Jump straight to any builder from any page (the home page already has the big tiles). */
export default function MakerBar() {
  const path = usePathname();
  if (path === "/" || path.startsWith("/login") || path.startsWith("/admin")) return null;
  const kinds = Object.keys(KINDS) as Kind[];
  return (
    <nav className="maker-bar no-print" aria-label="Make something">
      {kinds.map((k) => {
        const here = path === `/build/${k}`;
        return (
          <SpeakingLink key={k} href={`/build/${k}`} label={KIND_SPOKEN[k]} className={`maker ${k}${here ? " here" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/tiles/${k}.webp`} alt="" aria-hidden />
            <span>{KINDS[k].title}</span>
          </SpeakingLink>
        );
      })}
    </nav>
  );
}
