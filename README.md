# Starport Dream Factory

Kids press picture buttons to build their own Starport creatures, equipment and pets. Claude writes balanced stats from the Starport rules, OpenAI draws the picture, and the result is a trading card they can save, print or download as a PDF.

Parents hold the accounts. Plans: Free (3 creations total), Star $4.99/month (20 a month), Superstar $9.99/month (100 a month). "Shake up the stats" is free (10 per card); every new picture counts as 1 creation.

## Setup, step by step

### 1. Supabase (database, login, pictures)
1. Create a project at supabase.com.
2. SQL Editor → New query → paste everything in `supabase/schema.sql` → Run.
3. Authentication → URL Configuration: set **Site URL** to your site address, and add `https://YOUR-SITE/auth/callback` under Redirect URLs.
4. Project Settings → API: copy the Project URL, the `anon` key and the `service_role` key.

### 2. API keys
- Anthropic: console.anthropic.com → API Keys.
- OpenAI: platform.openai.com → API keys (add billing; images are pay-as-you-go).

### 3. Stripe
1. Products → Add product "Dream Factory Star", recurring $4.99/month. Copy its **price ID** (`price_…`).
2. Add "Dream Factory Superstar", recurring $9.99/month. Copy its price ID.
3. Developers → API keys: copy the secret key.
4. Settings → Billing → Customer portal: turn it on and allow switching between the two products and cancelling.
5. After step 4 below (when you have a site address): Developers → Webhooks → Add endpoint `https://YOUR-SITE/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret.

Start in Stripe **test mode**; switch to live keys and live price IDs when you launch.

### 4. Vercel
1. vercel.com → Add New → Project → import `starport-dream-factory` from GitHub.
2. Add every variable from `.env.example` under Environment Variables.
3. Deploy. Put the site address into `NEXT_PUBLIC_SITE_URL`, Supabase's Site URL, and the Stripe webhook, then redeploy.

### 5. Make yourself admin
Sign in once on the site, then in Supabase SQL Editor run:
```sql
update public.profiles set is_admin = true where email = 'YOUR EMAIL';
```
The Grown-ups page now shows an **Admin** button: give specific emails free access, or make the whole site free.

## Where things live
- `lib/options.ts`: every button (pictures, words, how many can be picked).
- `lib/starport-rules.ts`: the Starport rules, examples and price ladders the AI follows.
- `lib/access.ts`: plan limits and prices shown in the app.
- `lib/generate.ts`: the Claude and OpenAI calls.
- `components/Builder.tsx`, `components/Card.tsx`: the builder screen and the card.
