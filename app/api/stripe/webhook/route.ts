import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, tierForPrice } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe tells us when someone subscribes, switches plans, or cancels.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const db = createAdminClient();

  const applySubscription = async (sub: Stripe.Subscription) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const ended = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
    const tier = ended ? "free" : tierForPrice(sub.items.data[0]?.price.id);
    await db
      .from("profiles")
      .update({ tier, subscription_status: sub.status, stripe_subscription_id: sub.id })
      .eq("stripe_customer_id", customerId);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (session.client_reference_id && customerId) {
        await db
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", session.client_reference_id);
      }
      if (session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await applySubscription(await stripe().subscriptions.retrieve(subId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
