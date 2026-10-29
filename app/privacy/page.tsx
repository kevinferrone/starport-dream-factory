import { COMPANY, CONTACT_EMAIL, UPDATED } from "@/lib/site";

export const metadata = { title: "Privacy | Starport Dream Factory" };

const contact = CONTACT_EMAIL ? (
  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
) : (
  "the contact email listed on this page (coming soon)"
);

export default function Privacy() {
  return (
    <section className="panel legal">
      <h1>Privacy policy</h1>
      <p className="hint">Last updated {UPDATED}</p>

      <p>
        Starport Dream Factory is made by {COMPANY}. It lets families build their own creatures, equipment
        and pets for the Starport tabletop game. This page explains what we collect and why, in plain words.
      </p>

      <h2>Accounts belong to grown-ups</h2>
      <p>
        Every account is created and owned by a parent or guardian who is 18 or older. Children use the
        Dream Factory under that grown-up&apos;s account and supervision. We do not ask for, or knowingly
        collect, any personal information about children.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>The grown-up&apos;s email address, and their name if they sign in with Google.</li>
        <li>Which plan the account is on and how many creations have been made.</li>
        <li>
          What gets built: the buttons pressed, any words typed in the idea box, any drawing uploaded, and the
          cards and pictures that come out.
        </li>
      </ul>
      <p>
        Please help kids keep the idea box about their creation, not about themselves (no names, schools or
        addresses), and upload drawings rather than photos of people. Uploads that show a real person&apos;s
        face are turned away.
      </p>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>Payment card details. Payments are handled entirely by Stripe.</li>
        <li>Anything about a child: no names, ages, photos or locations.</li>
        <li>Advertising or tracking cookies. We only use the cookies needed to keep you signed in.</li>
      </ul>

      <h2>Who helps us run the Dream Factory</h2>
      <p>We share only what each service needs to do its job:</p>
      <ul>
        <li><b>Supabase</b> stores accounts, cards and pictures.</li>
        <li><b>Vercel</b> runs the website.</li>
        <li><b>Stripe</b> processes subscription payments.</li>
        <li>
          <b>Anthropic</b> and <b>OpenAI</b> receive the buttons, idea-box words and any uploaded drawing to
          write each card, draw its picture, record the read-aloud voice, and check uploads for anything
          unsuitable.
        </li>
        <li><b>Google</b> handles sign-in if you choose Continue with Google.</li>
        <li>
          <b>Meta</b> (Facebook and Instagram): when a grown-up creates an account or starts a paid plan, our
          server tells Meta that it happened, with a scrambled (hashed) copy of the grown-up&apos;s email, so we can
          see which of our ads work. We never send Meta anything about kids or what they build, and we don&apos;t use
          the Meta Pixel or advertising cookies.
        </li>
      </ul>
      <p>We never sell your information.</p>

      <h2>Keeping or deleting your information</h2>
      <p>
        Cards stay in your account until you throw them away. To delete your whole account and everything
        in it, email us at {contact} from the address on the account and we&apos;ll remove it.
      </p>

      <h2>Questions</h2>
      <p>Write to us at {contact}.</p>
    </section>
  );
}
