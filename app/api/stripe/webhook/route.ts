import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, tierForPrice, tierForCents } from "@/lib/stripe";
import { PLANS, isTier } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { sendMetaEvent } from "@/lib/meta";

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

  const applySubscription = async (sub: Stripe.Subscription, prev?: Partial<Stripe.Subscription>) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const ended = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
    // Decide the plan by what is actually being charged, so a mixed-up setting can't grant the wrong plan.
    const item = sub.items.data[0];
    const tier = ended ? "free" : tierForCents(item?.price.unit_amount) ?? tierForPrice(item?.price.id);
    // Newer Stripe versions keep the period end on the item.
    const periodEnd =
      (item as unknown as { current_period_end?: number })?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end;
    const cancelling = !!(sub.cancel_at_period_end || sub.cancel_at);

    const { data: rows } = await db
      .from("profiles")
      .update({ tier, subscription_status: sub.status, stripe_subscription_id: sub.id })
      .eq("stripe_customer_id", customerId)
      .select("id, tier");
    // Extra details for the admin pages (kept separate so a missing column never blocks the plan update).
    await db
      .from("profiles")
      .update({
        cancel_at_period_end: cancelling,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", customerId);

    const userId = rows?.[0]?.id ?? null;
    const name = isTier(tier) ? PLANS[tier].name : tier;
    if (event.type === "customer.subscription.created") {
      await logActivity({ userId, kind: "subscribed", detail: name });
      if (userId && !ended) {
        const { data: who } = await db.from("profiles").select("email").eq("id", userId).single();
        await sendMetaEvent({
          name: "Subscribe",
          email: who?.email,
          userId,
          value: (item?.price.unit_amount ?? 0) / 100,
          eventId: `sub-${sub.id}`,
        });
      }
    }
    else if (event.type === "customer.subscription.deleted") await logActivity({ userId, kind: "subscription_ended" });
    else if (prev) {
      if ("cancel_at_period_end" in prev || "cancel_at" in prev) {
        await logActivity({ userId, kind: cancelling ? "cancel_scheduled" : "cancel_undone", detail: name });
      }
      if ("items" in prev) await logActivity({ userId, kind: "plan_changed", detail: `Now ${name}` });
      if ("status" in prev && ["past_due", "unpaid"].includes(sub.status)) {
        await logActivity({ userId, kind: "payment_problem", detail: sub.status });
      }
    }
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
      await applySubscription(
        event.data.object as Stripe.Subscription,
        (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes
      );
      break;
  }

  return NextResponse.json({ received: true });
}
