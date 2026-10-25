"use client";

import { useEffect, useState } from "react";

const KEY = "df-read-aloud";

/** Says a word out loud if the read-aloud switch is on. Helps kids who don't read yet. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (localStorage.getItem(KEY) === "off") return;
  } catch {}
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

export function ReadAloudToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) !== "off");
    } catch {}
  }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
    if (next) speak("Read aloud is on");
  };
  return (
    <button className="icon-link" aria-pressed={on} onClick={toggle} title="Read buttons out loud">
      <span className="emoji" aria-hidden>{on ? "🔊" : "🔇"}</span>
      <span className="text">Read aloud</span>
    </button>
  );
}

/** A link or button that also speaks its label. */
export function SpeakingLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={className} onMouseEnter={() => speak(label)} onFocus={() => speak(label)}>
      {children}
    </a>
  );
}
