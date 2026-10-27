import Stripe from "stripe";
import type { Tier } from "@/lib/access";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICE_FOR: Record<Exclude<Tier, "free">, () => string> = {
  plus: () => process.env.STRIPE_PRICE_PLUS!,
  pro: () => process.env.STRIPE_PRICE_PRO!,
};

/** What each plan must cost, in cents. Checkout refuses to run if a price ID doesn't match. */
export const EXPECTED_CENTS: Record<Exclude<Tier, "free">, number> = { plus: 499, pro: 999 };

export function tierForPrice(priceId: string | undefined | null): Tier {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_PLUS) return "plus";
  return "free";
}
