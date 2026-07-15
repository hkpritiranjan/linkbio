import Stripe from "stripe";
import { Plan } from "@linkbio/types";

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PRICE_IDS: Record<Exclude<Plan, "free">, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? "price_placeholder_pro",
  business: process.env.STRIPE_BUSINESS_PRICE_ID ?? "price_placeholder_business",
};

export function planFromPriceId(priceId: string): Plan {
  if (priceId === PRICE_IDS.pro) return "pro";
  if (priceId === PRICE_IDS.business) return "business";
  return "free";
}
