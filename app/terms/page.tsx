import Link from "next/link";
import { COMPANY, CONTACT_EMAIL, UPDATED } from "@/lib/site";
import { PLANS, TIERS } from "@/lib/access";

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
        {TIERS.map((t) => (
          <li key={t}>
            The {PLANS[t].name} plan is {t === "free" ? "free" : PLANS[t].price.replace("/month", " a month")}:{" "}
            {PLANS[t].blurb.charAt(0).toLowerCase() + PLANS[t].blurb.slice(1)}.
          </li>
        ))}
        <li>
          Unlimited plans are for normal family use and include reasonable daily limits that keep the Dream Factory
          running smoothly for everyone.
        </li>
        <li>Unused creations don&apos;t roll over. Paid plans renew monthly until you cancel.</li>
        <li>
          You can change or cancel anytime from the Grown-ups page. When you cancel, your plan stays active until
          the end of the month you&apos;ve paid for, then no further charges are made. Payments already made aren&apos;t
          refunded, except where the law requires it.
        </li>
      </ul>

      <h2>Your creations: personal use only</h2>
      <p>
        Cards you make in the Dream Factory are for your family&apos;s personal, non-commercial use. You may print
        them, edit them, play with them, and share them with family and friends for free.
      </p>
      <p>You may not:</p>
      <ul>
        <li>sell, resell, rent or trade cards for money, alone or as part of a product (for example a printed deck, game, book, sticker, shirt or toy);</li>
        <li>reproduce or publish cards in bulk, or offer them for download or sale on websites, marketplaces, print-on-demand services or social media shops;</li>
        <li>use cards, their pictures or their text in advertising, marketing, or any commercial product or service;</li>
        <li>use cards or anything else from the Dream Factory to train or build another AI model or a competing product.</li>
      </ul>
      <p>
        Starport, its name, logo, world, characters and rules, and the Dream Factory itself belong to {COMPANY}.
        Using the Dream Factory doesn&apos;t give you any ownership of them. Cards are made for use with the Starport
        game. For anything beyond personal use, like a classroom, library, club or event, please{" "}
        <Link href="/contact">contact us</Link> first.
      </p>
      <p>
        Cards are written and drawn by AI, so they can occasionally be odd or unbalanced. Tweak them at your table.
      </p>

      <h2>Be kind</h2>
      <p>
        Don&apos;t use the idea box to make anything hurtful, scary or inappropriate for kids, or to copy
        characters from other games, books or shows. We may block requests or close accounts that do.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email {CONTACT_EMAIL} or use our <Link href="/contact">contact page</Link>.
      </p>
    </section>
  );
}
