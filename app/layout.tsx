import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { ReadAloudToggle, SpeakingLink } from "@/components/ReadAloud";
import { PHRASES } from "@/lib/voice-phrases";

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
            <a href="/" className="brand">
              <span aria-hidden>🏭</span>
              <span className="text">Dream Factory</span>
            </a>
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
