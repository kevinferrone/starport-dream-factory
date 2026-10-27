import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PRICE_FOR, EXPECTED_CENTS } from "@/lib/stripe";

// Grown-up picks a plan on /plans → this sends them to Stripe's payment page.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });

  const form = await req.formData();
  const tier = form.get("tier");
  if (tier !== "plus" && tier !== "pro") return NextResponse.redirect(new URL("/plans", req.url), { status: 303 });

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const s = stripe();

  // Already subscribed? Switching plans happens in Stripe's billing portal.
  if (profile?.stripe_customer_id && ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "")) {
    const portal = await s.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${site}/plans`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  }

  // Safety check: make sure the price ID in Vercel really is this plan's price.
  const priceId = PRICE_FOR[tier]();
  const price = await s.prices.retrieve(priceId).catch(() => null);
  if (!price || price.unit_amount !== EXPECTED_CENTS[tier] || !price.recurring) {
    console.error(`Stripe price for ${tier} is wrong: ${priceId} = ${price?.unit_amount}`);
    return NextResponse.redirect(new URL("/plans?error=price", req.url), { status: 303 });
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
    subscription_data: { metadata: { tier } },
    success_url: `${site}/plans?welcome=1`,
    cancel_url: `${site}/plans`,
    allow_promotion_codes: true,
  });
  return NextResponse.redirect(session.url!, { status: 303 });
}
