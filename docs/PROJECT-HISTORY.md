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
- **Free**: 3 creations total
- **Star**: $4.99/month, 20 creations
- **Superstar**: $9.99/month, capped at 100
- "Change the stats" is free, up to 10 times per card. Thrown-away cards still count.
- Admin page: comp specific emails a plan, or make the whole site free. Only kevin.ferrone@gmail.com is admin.
- Stripe grants the plan by the **amount charged** (499 / 999 cents) and checkout verifies prices, after a bug where the wrong price ID gave Superstar for $4.99.

## Sign-in
Google, emailed link, or password (set on the Grown-ups page). Parents confirm they're a grown-up on first sign-in.

## Kid-facing features
- Home tiles: Joke Troll (Creatures), magical backpack (Equipment), Chatter (Pets)
- Read-aloud on hover, voice "sage". Tiles say "Creatures / Equipment / Pets".
- **Read my card**: whole card read aloud with word highlighting. Slower for K–2, a little slower for 3–4.
- **Reading level** setting (K–7+) on the Grown-ups page changes card wording only, never the rules.
- No button is required. Pressing Build with nothing picked fills in random choices.
- Creature and pet personality: pick 1.
- **Drawing upload**: the kid's drawing is the main reference for the picture.
- **Cards are tarot size (2.75 x 4.75 in).** The picture shrinks to make room for words (down to about half its height), then the text shrinks. Download PDF is one card on a tarot-size page (ready for a print shop). Print opens that same PDF. The print sheet is 6 per letter page, edge to edge with cut marks. Card text is capped: description 25 words or fewer, each rule 30 words or fewer.
- Card actions: Read my card, Change the stats, Change my buttons (not on creatures), Save, Print, Download PDF, Throw away.
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

### Logic guards (`lib/starport-rules.ts`)
- Every build runs these checks: rules that can never be broken, a **table test**, and a **never-do** list (`KNOWN_MISTAKES`).
- Then a second review pass checks the result.
- When a nonsense rule slips through, add it to `KNOWN_MISTAKES`.

### Pictures
- Random inspiration (body base, palette, pose, backdrop), plus a list of recent looks to avoid, so the same picture doesn't repeat (the repeated green alien bug).
- The description is checked against the finished picture, so a card can't say "13 eyes" over a 2-eyed picture.

## Open / next
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
