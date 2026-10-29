import type { Metadata } from "next";
import { CONTACT_EMAIL, COMPANY } from "@/lib/site";
import CopyEmail from "./CopyEmail";

export const metadata: Metadata = { title: "Contact · Starport Dream Factory" };

export default function ContactPage() {
  const subject = encodeURIComponent("Starport Dream Factory");
  return (
    <div className="legal">
      <h1>Contact us</h1>
      <p>
        Questions about your account, a plan, or a card? Email us and a real person at {COMPANY} will write back.
      </p>
      <p className="contact-email">{CONTACT_EMAIL}</p>
      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <a className="big-btn small" href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>
          <span className="emoji" aria-hidden>✉️</span> Open my email app
        </a>
        <a
          className="big-btn small plain"
          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${subject}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="emoji" aria-hidden>📨</span> Write in Gmail
        </a>
        <CopyEmail email={CONTACT_EMAIL} />
      </div>
    </div>
  );
}
