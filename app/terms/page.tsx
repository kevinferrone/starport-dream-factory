import { COMPANY, CONTACT_EMAIL, UPDATED } from "@/lib/site";

export const metadata = { title: "Terms | Starport Dream Factory" };

export default function Terms() {
  return (
    <section className="panel legal">
      <h1>Terms of use</h1>
      <p className="hint">Last updated {UPDATED}</p>

      <p>
        Starport Dream Factory is run by {COMPANY}. By creating an account you agree to these terms.
      </p>

      <h2>Accounts</h2>
      <p>
        Accounts are for parents and guardians 18 or older. You&apos;re responsible for supervising children
        who use the Dream Factory under your account.
      </p>

      <h2>Plans and billing</h2>
      <ul>
        <li>The Free plan includes 3 creations in total.</li>
        <li>The Star plan is $4.99 a month and includes 20 creations each month.</li>
        <li>The Superstar plan is $9.99 a month and includes 100 creations each month.</li>
        <li>Unused creations don&apos;t roll over. Paid plans renew monthly until you cancel.</li>
        <li>You can change or cancel anytime from the Grown-ups page; cancelling stops future charges.</li>
      </ul>

      <h2>Your creations</h2>
      <p>
        Cards you make are yours to print, play with and share with family and friends. Starport, its logo,
        world and rules belong to {COMPANY}; your cards are made for use with the Starport game. Cards are
        written and drawn by AI, so they can occasionally be odd or unbalanced. Tweak them at your table.
      </p>

      <h2>Be kind</h2>
      <p>
        Don&apos;t use the idea box to make anything hurtful, scary or inappropriate for kids, or to copy
        characters from other games, books or shows. We may block requests or close accounts that do.
      </p>

      <h2>Contact</h2>
      <p>
        {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : "Contact email coming soon."}
      </p>
    </section>
  );
}
