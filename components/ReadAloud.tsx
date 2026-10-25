"use client";

import { useEffect, useState } from "react";
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
  const audio = new Audio(`/api/voice?t=${encodeURIComponent(text)}`);
  current = audio;
  let fellBack = false;
  const fallback = () => {
    if (fellBack || current !== audio) return;
    fellBack = true;
    deviceVoice(text);
  };
  audio.onerror = fallback;
  audio.play().catch(fallback);
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
    <button className="icon-link" aria-pressed={on} onClick={toggle} title="Read buttons out loud">
      <span className="emoji" aria-hidden>{on ? "🔊" : "🔇"}</span>
      <span className="text">Read aloud</span>
    </button>
  );
}

/**
 * A link that says its name first. On a tap it speaks, waits a moment so the word
 * can be heard, then goes. With read-aloud off it goes straight away.
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
  return (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        if (!isOn() || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        speak(label);
        setTimeout(() => router.push(href), 750);
      }}
    >
      {children}
    </a>
  );
}
