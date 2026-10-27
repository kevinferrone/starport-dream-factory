import Stripe from "stripe";
import { PLANS, PAID_TIERS, type PaidTier, type Tier } from "@/lib/access";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Vercel environment variable holding each plan's Stripe price ID. */
export const PRICE_ENV: Record<PaidTier, string> = {
  plus: "STRIPE_PRICE_PLUS",
  pro: "STRIPE_PRICE_PRO",
  max: "STRIPE_PRICE_MAX",
  unlimited: "STRIPE_PRICE_UNLIMITED",
};
export const priceFor = (tier: PaidTier) => process.env[PRICE_ENV[tier]] ?? "";

/** What each plan must cost, in cents. Checkout refuses to run if a price ID doesn't match. */
export const EXPECTED_CENTS = Object.fromEntries(PAID_TIERS.map((t) => [t, PLANS[t].cents])) as Record<PaidTier, number>;

/** The plan for an amount charged (most reliable), or null. */
export const tierForCents = (cents: number | null | undefined): PaidTier | null =>
  PAID_TIERS.find((t) => EXPECTED_CENTS[t] === cents) ?? null;

export function tierForPrice(priceId: string | undefined | null): Tier {
  return (priceId && PAID_TIERS.find((t) => priceFor(t) === priceId)) || "free";
}

/** Link to a customer in the Stripe dashboard (test or live, matching the key in use). */
export const stripeCustomerUrl = (customerId: string) =>
  `https://dashboard.stripe.com/${process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test/" : ""}customers/${customerId}`;
