import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe =
  secretKey && secretKey.startsWith("sk_")
    ? new Stripe(secretKey, { apiVersion: "2026-02-25.clover" })
    : null;

export const isStripeEnabled = !!stripe;
