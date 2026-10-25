"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PHRASES } from "@/lib/voice-phrases";

const KEY = "df-read-aloud";
let current: HTMLAudioElement | null = null;

function isOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

const voiceUrl = (text: string) => `/api/voice?t=${encodeURIComponent(text)}`;

/** Fallback: the device's own voice, picking the softest-sounding one available. */
function deviceVoice(text: string) {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  const prefer = ["Natural", "Ava", "Samantha", "Aria", "Jenny", "Google US English", "Karen", "Moira"];
  const voice =
    prefer.map((p) => voices.find((v) => v.lang.startsWith("en") && v.name.includes(p))).find(Boolean) ??
    voices.find((v) => v.lang.startsWith("en"));
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 0.9;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

/** Says a phrase in the warm Dream Factory voice, if read-aloud is on. */
export function speak(text: string) {
  if (typeof window === "undefined" || !isOn()) return;
  try {
    current?.pause();
    window.speechSynthesis?.cancel();
  } catch {}
  const audio = new Audio(voiceUrl(text));
  current = audio;
  let fellBack = false;
  const fallback = (err?: unknown) => {
    // Browsers refuse sound until the first tap on a page; don't fall back for that.
    if ((err as DOMException)?.name === "NotAllowedError") return;
    if (fellBack || current !== audio) return;
    fellBack = true;
    deviceVoice(text);
  };
  audio.onerror = () => fallback();
  audio.play().catch(fallback);
}

/** Records phrases ahead of time (a few at once) so hovering speaks instantly. */
export function warmVoices(phrases: string[]) {
  if (typeof window === "undefined" || !isOn()) return;
  const queue = [...new Set(phrases)];
  const worker = async () => {
    for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
      try {
        await fetch(voiceUrl(p));
      } catch {}
    }
  };
  setTimeout(() => [worker(), worker(), worker()], 800);
}

/**
 * Spread onto any button: it speaks when the mouse moves over it or keyboard focus
 * lands on it, and on a tap for touch screens (which have no hover).
 */
export function useSpeakOnHover() {
  const lastPointer = useRef<string>("mouse");
  return (label: string) => ({
    onMouseEnter: () => speak(label),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) speak(label);
    },
    onPointerDown: (e: React.PointerEvent) => {
      lastPointer.current = e.pointerType;
    },
    spokeOnClick: () => {
      if (lastPointer.current !== "mouse") speak(label);
    },
  });
}

/** Small reminder that sound starts after the first tap (a browser rule). */
function TapHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!isOn() || ua?.hasBeenActive) return;
    setShow(true);
    const hide = () => setShow(false);
    window.addEventListener("pointerdown", hide, { once: true });
    window.addEventListener("keydown", hide, { once: true });
    return () => {
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
    };
  }, []);
  if (!show) return null;
  return (
    <div className="tap-hint" role="status">
      <span aria-hidden>👆</span> Tap anywhere to hear the buttons
    </div>
  );
}

export function ReadAloudToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(isOn()), []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
    if (next) speak(PHRASES.readAloudOn);
  };
  return (
    <>
      <button className="icon-link" aria-pressed={on} onClick={toggle} title="Read buttons out loud">
        <span className="emoji" aria-hidden>{on ? "🔊" : "🔇"}</span>
        <span className="text">Read aloud</span>
      </button>
      <TapHint />
    </>
  );
}

/**
 * A link that says its name when the mouse is over it. On a touch screen (no hover)
 * a tap speaks first, waits a moment so the word can be heard, then goes.
 */
export function SpeakingLink({
  href,
  label,
  children,
  className,
  title,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const router = useRouter();
  const lastPointer = useRef<string>("mouse");
  return (
    <a
      href={href}
      className={className}
      title={title}
      onMouseEnter={() => speak(label)}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) speak(label);
      }}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        if (lastPointer.current === "mouse" || !isOn()) {
          router.push(href);
        } else {
          speak(label);
          setTimeout(() => router.push(href), 750);
        }
      }}
    >
      {children}
    </a>
  );
}

/** Drop on a page to pre-record its spoken words. */
export function WarmVoices({ phrases }: { phrases: string[] }) {
  useEffect(() => warmVoices(phrases), [phrases.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
