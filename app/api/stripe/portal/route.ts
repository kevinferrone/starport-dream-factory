import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGrownup } from "@/lib/grownup";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// "Manage or cancel my plan" → Stripe's billing portal.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  if (!(await isGrownup(user.id))) return NextResponse.redirect(new URL("/grownups?next=/plans", req.url), { status: 303 });

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) return NextResponse.redirect(new URL("/plans", req.url), { status: 303 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const portal = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${site}/plans`,
  });
  return NextResponse.redirect(portal.url, { status: 303 });
}
