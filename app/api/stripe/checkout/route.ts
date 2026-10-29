import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGrownup } from "@/lib/grownup";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, priceFor, EXPECTED_CENTS } from "@/lib/stripe";
import { isPaidTier } from "@/lib/access";

// Grown-up picks a plan on /plans → this sends them to Stripe's payment page.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  if (!(await isGrownup(user.id))) return NextResponse.redirect(new URL("/grownups?next=/plans", req.url), { status: 303 });

  const form = await req.formData();
  const tier = form.get("tier");
  if (!isPaidTier(tier)) return NextResponse.redirect(new URL("/plans", req.url), { status: 303 });

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const s = stripe();

  // Safety check: make sure the price ID in Vercel really is this plan's price.
  const priceId = priceFor(tier);
  const price = priceId ? await s.prices.retrieve(priceId).catch(() => null) : null;
  if (!price || price.unit_amount !== EXPECTED_CENTS[tier] || !price.recurring) {
    console.error(`Stripe price for ${tier} is wrong: ${priceId} = ${price?.unit_amount}`);
    return NextResponse.redirect(new URL("/plans?error=price", req.url), { status: 303 });
  }

  // Already subscribed? Switch plans in Stripe's billing portal, straight to confirming the plan they picked.
  if (profile?.stripe_customer_id && ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "")) {
    let url: string | null = null;
    try {
      const sub = profile.stripe_subscription_id ? await s.subscriptions.retrieve(profile.stripe_subscription_id) : null;
      const item = sub?.items.data[0];
      // A plan that's set to cancel can't switch directly; those go to the regular portal (renew, then switch).
      if (sub && item && !sub.cancel_at_period_end && !sub.cancel_at) {
        const portal = await s.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: `${site}/plans`,
          flow_data: {
            type: "subscription_update_confirm",
            subscription_update_confirm: { subscription: sub.id, items: [{ id: item.id, price: priceId, quantity: 1 }] },
            after_completion: { type: "redirect", redirect: { return_url: `${site}/plans?welcome=1` } },
          },
        });
        url = portal.url;
      }
    } catch (e) {
      console.error("plan switch", e);
    }
    if (!url) {
      const portal = await s.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${site}/plans` });
      url = portal.url;
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  let customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { tier, ua: (req.headers.get("user-agent") ?? "").slice(0, 450) } },
    success_url: `${site}/plans?welcome=1`,
    cancel_url: `${site}/plans`,
    allow_promotion_codes: true,
  });
  return NextResponse.redirect(session.url!, { status: 303 });
}
