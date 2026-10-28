import type { Metadata } from "next";
import Link from "next/link";
import { Baloo_2 } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { ReadAloudToggle, SpeakingLink, WarmVoices } from "@/components/ReadAloud";
import { PHRASES, KIND_SPOKEN } from "@/lib/voice-phrases";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-baloo" });

export const metadata: Metadata = {
  title: "Starport Dream Factory",
  description: "Build your own Starport creatures, equipment and pets.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={baloo.variable}>
      <body>
        <div className="wrap">
          <header className="topbar">
            <Link href="/" className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="mascot" src="/flummox.webp" alt="" aria-hidden />
              <span className="text">Dream Factory</span>
            </Link>
            {user && (
              <>
                <SpeakingLink href="/" label={PHRASES.home} className="icon-link" title="Home">
                  <span className="emoji" aria-hidden>🏠</span>
                  <span className="text">Home</span>
                </SpeakingLink>
                <SpeakingLink href="/cards" label={PHRASES.myCards} className="icon-link" title="My cards">
                  <span className="emoji" aria-hidden>🗂️</span>
                  <span className="text">My cards</span>
                </SpeakingLink>
                <ReadAloudToggle />
                <WarmVoices
                  phrases={[
                    ...Object.values(KIND_SPOKEN),
                    PHRASES.home,
                    PHRASES.myCards,
                    PHRASES.grownUps,
                    PHRASES.saveCard,
                    PHRASES.editCard,
                    PHRASES.saved,
                    PHRASES.print,
                    PHRASES.pdf,
                    PHRASES.building,
                  ]}
                />
                <SpeakingLink href="/plans" label={PHRASES.grownUps} className="icon-link" title="Grown-ups">
                  <span className="emoji" aria-hidden>🔑</span>
                  <span className="text">Grown-ups</span>
                </SpeakingLink>
              </>
            )}
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
