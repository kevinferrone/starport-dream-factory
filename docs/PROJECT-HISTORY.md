# Starport Dream Factory — Project History & Handoff

Read this first when picking the project back up. It records what was built, every decision Kevin made, and what's still open. The code itself lives in GitHub (kevinferrone/starport-dream-factory); this file explains the why.

Last updated: October 27, 2026

## What it is
A web app where kids press picture buttons to build Starport **Creatures, Equipment and Pets**. The AI turns the picks into a balanced, Player-facing card with a picture. Cards can be saved, printed, downloaded as a one-page PDF, or printed 6 per page.

- Owner: Wider Path, LLC. Contact for parents: info@widerpathgames.com
- Mascot: Flummox (logo, favicon, loading screen)
- Live at: starport-dream-factory.vercel.app, moving to **starportdreamfactory.com**

## Accounts and services
| Service | Used for |
|---|---|
| GitHub `kevinferrone/starport-dream-factory` | Code. Claude writes and pushes. |
| Vercel | Hosting, auto-deploys from `main`. Domain bought here. |
| Supabase | Sign-in, database, storage bucket `card-images` |
| Anthropic (Claude) | Writes card stats, checks drawings, matches description to picture |
| OpenAI | Pictures (`gpt-image-1.5`, medium), voice (`gpt-4o-mini-tts`, voice "sage"), word timings (whisper-1), safety checks |
| Stripe | Subscriptions (currently **test mode**) |
| Google Cloud | "Continue with Google" sign-in |
| Resend | Sign-in email sender (being set up on the new domain) |

Secret keys live only in Vercel environment variables and Kevin's private note — never in chat or the repo.

## Plans
Names, prices and limits live in one place: `PLANS` in `lib/access.ts`.
- **Free**: 3 creations total
- **Star** (`plus`): $4.99/month, 20 creations
- **Superstar** (`pro`): $9.99/month, 50 creations (changed from 100 on Oct 27)
- **Supernova** (`max`): $19.99/month, 100 creations
- **Galaxy** (`unlimited`): $99/month, shown as unlimited. A hidden limit of 50 in any 24 hours applies; when it's hit, kids see "The Dream Factory needs to rest. Come back tomorrow for more creations!" (`lib/messages.ts`).
- Stripe price IDs go in the Vercel variables `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX` and `STRIPE_PRICE_UNLIMITED`. Checkout verifies each price's amount, and the webhook grants the plan by the amount charged.
- Cancelling keeps the plan until the end of the paid period. The Stripe Customer portal must be set to "Cancel at end of billing period."
- The Stripe webhook must use the **www** address (`https://www.starportdreamfactory.com/api/stripe/webhook`). The bare domain gives a 308 redirect, and Stripe doesn't follow it.
- "Change the stats" is free, up to 10 times per card. Thrown-away cards still count; creations restored by an admin don't.

## Admin panel (/admin; only kevin.ferrone@gmail.com)
- **Overview**: accounts, paying subscribers, estimated monthly revenue, cards made, pictures per card, subscribers by plan, latest activity. Also the site-wide free switch and free access by email.
- **Users**: search by email; plan, cards this month and in total, last card, last sign-in.
- **User page**:
  - Log in as this user (signs the admin out of their own account).
  - Email them a sign-in link.
  - Give back their last N creations, or restore a single card.
  - Set free access.
  - Link to the customer in Stripe.
  - Their cards and their activity.
- **Subscriptions**: active (or all) with status, renew/end date, a "cancelling" flag, and a Stripe link. Refunds and cancelling on someone's behalf happen in Stripe.
- **Activity**: the newest cards with thumbnails, plus a log of sign-ups, cards, billing events and admin actions (the `activity` table).
- SQL for these: `supabase/2026-10-27-plans-and-admin.sql`.

## Feedback buttons (Oct 29)
- Signed-in pages (not login or admin) show "Report a bug" and "Request a feature" in the bottom-right corner.
- Each opens a form. The message is emailed to info@widerpathgames.com through Resend, from hello@starportdreamfactory.com, with reply-to set to the parent's email.
- Each message is logged in Activity. Limit: 10 per day per user.
- Needs `RESEND_API_KEY` in Vercel. Code: `components/FeedbackButtons.tsx`, `/api/feedback`.

## Meta ads measurement (Oct 29)
- Server-side Conversions API only (`lib/meta.ts`). There's no Pixel and no cookies, and nothing is sent from kids' pages.
- Events:
  - `CompleteRegistration`: when a parent finishes the grown-up step, once per account.
  - `Subscribe`: on Stripe `customer.subscription.created`, with the price as its value.
- Each event carries a hashed email and a hashed user id, plus an event_id so retries aren't double-counted.
- Off until `META_PIXEL_ID` and `META_CAPI_TOKEN` are set in Vercel. `META_TEST_EVENT_CODE` is for testing only.
- The privacy policy now lists Meta.
- Plan: Kevin connects Meta (Adspirer Social Ads connector, or Claude in Chrome). Campaigns launch paused; Kevin approves all spend and budget changes; there's an account spending limit; a weekly review runs as a scheduled task.

## Grown-up check (Oct 29)
- The Grown-ups page, plan checkout, Manage my plan, and Admin all ask a multiplication question first (6–9 × 6–12, typed answer, never read aloud).
- Passing unlocks it on that device for 10 minutes, using a signed cookie (`lib/grownup.ts`, `/grownups`).
- Kevin chose this over a PIN so parents never get locked out by a forgotten PIN.

## Sign-in
Google, emailed link, or password (set on the Grown-ups page).
- Google uses Google's own button (`app/login/GoogleButton.tsx`, Google Identity Services, then Supabase `signInWithIdToken`), so Google's screen shows our domain instead of the long supabase.co address. It needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel. Without it, the button falls back to the old Supabase redirect. starportdreamfactory.com is verified in Google Search Console (TXT record in Vercel DNS). Google branding is verified (Oct 27), and supabase.co was removed from the authorized domains and redirect URIs. Parents confirm they're a grown-up on first sign-in.

## Kid-facing features
- Home tiles: Joke Troll (Creatures), magical backpack (Equipment), Chatter (Pets)
- Read-aloud on hover, voice "sage". Tiles say "Creatures / Equipment / Pets".
- **Read my card**: whole card read aloud with word highlighting. Slower for K–2, a little slower for 3–4.
- **Reading level** setting (K–7+) on the Grown-ups page changes card wording only, never the rules.
- No button is required. Pressing Build with nothing picked fills in random choices.
- Creature and pet personality: pick 1.
- **Drawing upload**: the kid's drawing is the main reference for the picture.
- **Cards are tarot size (2.75 x 4.75 in).** The picture shrinks to make room for words (down to about half its height), then the text shrinks. Download PDF is one card on a tarot-size page (ready for a print shop). Print opens that same PDF. The print sheet is 6 per letter page, edge to edge with cut marks. Card text is capped: description 25 words or fewer, each rule 30 words or fewer.
- **Edit my card**: change any words or numbers on a card (name, description, Difficulty and Successes, abilities and special, Cost, Type, whether it takes a turn, Bonus, Power). The card updates live as you type. Saving is free (no AI, no new picture) and still runs the weapons check and the moderation check. Code: `components/CardEditor.tsx`, `lib/card-edit.ts`, `/api/edit`.
- Equipment no longer has the Feelings power buttons (removed Oct 27).
- Card actions: Read my card, Save, Print, Download PDF, Throw away. "Change the stats" still works but its button is hidden for the MVP; `SHOW_CHANGE_STATS` in components/CardActions.tsx brings it back.
- My cards page is grouped by kind, with a 6-per-page print sheet.
- Kind badge (troll / backpack / Chatter) on every card.

## Card rules (Kevin's decisions)
- Cards are for **Players only**. No Guide notes on cards.
- Numerals for game values; "Guide" always capitalized.
- No "twists". Variety comes from description and context.
- Mechanics come from **pattern banks** in `lib/patterns.ts`, drawn by rarity: common 6, uncommon 3, rare 1 (pets: main 3, rare 1). Each matching button picked makes a pattern 3× more likely, but never guarantees it.
- After a pattern is chosen, the AI may adjust it slightly to fit the item.
- Kevin approves every bank change before it's built.

### Creature abilities
- Common: direct hit, group hit, roll-or-tokens, dodge, roll-or-turn, hit-then-roll
- Uncommon: pay-to-shake, stuck (escape with a Sneaky or Tough roll; freed when defeated), follow-up, grab item, grab coins, no tokens, silly action (lose 1 token and do a silly action, chosen by the Guide, for the rest of the encounter), vanish (finding it takes a turn and a Smart roll and doesn't count as a success), share pain, transform (lasts 1 turn; a friend's 2 Helpful tokens frees them sooner)
- Rare: pass it on, do-over, trait wipe (Difficulty 15+), trait shutoff (12+)

### Creature specials
- Common: right approach, on success, on fail, bribe
- Uncommon: one-way, no trait tokens, hard to help, pay before, ambush, roll twice, grows, ouch aura
- Rare: adapts, trait fails (15+), double turn (15+)
- **Removed**: "run out of tokens → lose turn", sliding scale, stuck until defeated, keeps hurting, wobbly, push away, call a buddy, milestone twist, slippery/ghostly, happy ending, can't hide

### Equipment: keep forever
- Common: more tokens, better rolls, action item, second chance, token saver, token swap, natural luck (+1 token when you roll a 20 or a 1)
- Uncommon: go first (cheap, 3 Coins; beats creatures that ambush), help a friend, shield, double tokens, two at once (roll against 2 creatures), pocket refill, lucky streak, comeback
- Rare: super senses, every roll, coins to tokens, star roll

### Equipment: use once
- Common: refill, big boost, silly fix, soft landing
- Uncommon: sure thing, coin toss, block, wild token, sleepy time
- Rare: double up, zoom home, quick power, everybody freeze (every creature misses its next turn; every Player rolls Tough, Difficulty 15, or misses theirs too)

### Equipment item types
40 items. Use-once items: Orb, Potion, Cookie, Glitter, Sticker, Candy, Cupcake, Juice box, Balloon, Magic scroll, Seed, Lucky dice, Party popper, Candle, Mystery egg.
**Standing rule:** every new item type must be tagged keep or once, with its pattern boosts, using `item()` in `lib/options.ts`.

### Pets
- Bonus: little buddy, big bonus, all-rounder
- Powers (common and uncommon are combined, equal odds): trick, treasure sniffer, scout, protector (blocks 1 creature's ability once per adventure), do-over, distraction, digger, ride (Big pets only)
- Rare: future seer, teleporter, pocket shop, vanishing

### Coin value (equipment and pets, approved Oct 27)
- An optional slider from 1 to 50 Coins, defaulting to "The factory picks." When set, the card's cost is exactly that value, and `coinPlan` in `lib/patterns.ts` picks the rarity and number of powers. The item keeps its own type.
- Keep forever:
  - 1–4: 1 small power
  - 5–14: 1 common
  - 15–24: 1 common or uncommon
  - 25–39: 1 strong uncommon, or 2 powers
  - 40–50: 2 powers, 1 of them rare
- Use once:
  - 1–4: 1 small
  - 5–9: 1 common
  - 10–19: 1 common or uncommon
  - 20–34: 2 powers, or 1 rare
  - 35–50: 2 powers, 1 of them rare
- Pets:
  - 1–9: Bonus only (+1, then +2)
  - 10–19: Bonus of +1 or +2, plus 1 main power
  - 20–34: about +4, plus 1 main power
  - 35–50: +6 to +8, plus 1 rare power and a small perk
  - Ride stays Big-only.
- With two powers, the effect may run up to 45 words.

### Logic guards (`lib/starport-rules.ts`)
- Every build runs these checks: rules that can never be broken, a **table test**, and a **never-do** list (`KNOWN_MISTAKES`).
- Then a second review pass checks the result.
- When a nonsense rule slips through, add it to `KNOWN_MISTAKES`.

### Pictures
- Random inspiration (body base, palette, pose, backdrop), plus a list of recent looks to avoid, so the same picture doesn't repeat (the repeated green alien bug).
- Colors: unless the kid picks a color button, the code picks a palette that shares no main color with the last 2 cards on the site. The palette is required in the picture prompt and saved on the card as `palette`. This fixed back-to-back purple-and-green equipment.
- The description is checked against the finished picture, so a card can't say "13 eyes" over a 2-eyed picture.

## Open / next
- Parked (Oct 29): printed cards. Option 1: order in-app through QPMN's API (no minimum, tarot 2.75×4.75 decks of 1–160 cards, drop-shipped, about $18–21 for 78 cards). Option 2: print-ready file download (300 dpi with 1/8" bleed, plus a card back). Both need a card back design and a test print, since picture quality is currently set to "low".
1. **New domain starportdreamfactory.com** (in progress):
   - Bought in Vercel, then connected to the project.
   - Set up Resend for it (DNS records plus DMARC).
   - Supabase custom SMTP: smtp.resend.com, port 465, user `resend`. Sender hello@starportdreamfactory.com, name "Starport Dream Factory". Raise the email limit to about 100/hour.
   - Change the address everywhere: Vercel `NEXT_PUBLIC_SITE_URL`, Supabase Site URL and Redirect URLs, Google OAuth origins and Branding, the Stripe webhook.
   - Then test all three sign-in methods.
2. Give family testers free access through Admin.
3. Take Stripe live (steps given earlier; clear test billing fields in Supabase first).
4. Optional: an Admin "Email them an invite" button (offered, not yet requested).
5. Possible later: iOS/Android app (discussed only).

## Picture accuracy and no weapons (Oct 27)
- The bug: a frog pet came out as the same little green alien in a space suit holding a laser. The word "Starport" in the picture style made the picture model reach for space aliens, so it's gone from `IMAGE_STYLE`.
- The picture prompt now starts with MUST SHOW (the kid's look buttons), then the subject, then the style, then `IMAGE_NEVER` (no weapons or sharp things, nothing held unless asked, no space suits).
- Oct 29: the picture check now names what the picture shows and must confirm it's the same kind of thing (an alpaca drawn as a cat fails). The final match can fix the name too, not just the description.
- After drawing, Claude checks the picture: right kind of thing, every pick visible, no weapon, no unasked space suit. If it fails, the picture is redrawn with the fix, up to 2 times.
- Card text: weapons and sharp things are banned in the unbreakable rules, and a code check (`WEAPONS` regex in checkCard) rejects any card that mentions one.

## Cost savings (Oct 27)
- The rules part of Claude's instructions uses prompt caching.
- The drawing check uses the small model (`ANTHROPIC_FAST_MODEL`, default claude-haiku-5-5). The picture match was moved back to `ANTHROPIC_MODEL` on Oct 29, after an "alpaca" description appeared on a cat picture.
- Kevin is testing `OPENAI_IMAGE_QUALITY=low`.

## Bugs already fixed (don't reintroduce)
- `tool_choice` must be `auto`; forcing a tool errors on this model.
- The PDF is drawn directly with jsPDF (no screenshot), and fits one page. Print uses a 4in card.
- No nonsense rules like "add 5 to your turn order".
- No "everyone loses their turn" items.
- No trapping effects without an escape.
- Supabase Site URL must include `https://`, with no extra path.
- Email templates link to `{{ .SiteURL }}/auth/confirm?token_hash=…` (our domain), not `{{ .ConfirmationURL }}` (supabase.co). The mismatched link made Google delay mail from the new domain.

## Done Oct 27, 2026
- Bought starportdreamfactory.com in Vercel; www added as a second Production domain.
- Resend verified the domain (auto-configured in Vercel DNS) and a DMARC record was added. Supabase sends mail through Resend SMTP as hello@starportdreamfactory.com; the limit is 100/hour.
- Site URL updated in Vercel, Supabase, Google OAuth and Branding, and the Stripe test webhook.
- Polaris Google Workspace: starportdreamfactory.com is on an approved-senders spam bypass rule.
