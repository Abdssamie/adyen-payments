"use node";

import { action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { AdyenPayments } from "@abdssamie/adyen-payments";
import { v } from "convex/values";

const adyenClient = new AdyenPayments(components.adyenPayments, {
  autoCapture: true,
});

// Helper to get app URL
function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error("APP_URL environment variable is not set.");
  }
  return url;
}

// 1. Get or create shopper
export const getOrCreateShopper = action({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = args.userId ?? identity?.subject ?? "guest_shopper_1";
    const email = args.email ?? identity?.email ?? (userId === "guest_shopper_1" ? "guest@example.com" : undefined);
    const name = args.name ?? identity?.name ?? (userId === "guest_shopper_1" ? "Guest Shopper" : undefined);

    return await adyenClient.getOrCreateShopper(ctx, {
      userId,
      email,
      name,
    });
  },
});

// 2. Create checkout session
export const createCheckout = action({
  args: {
    amount: v.number(),
    currency: v.string(),
    shopperReference: v.optional(v.string()),
    autoCapture: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const shopperReference = args.shopperReference ?? identity?.subject ?? "guest_shopper_1";

    const shopperResult = await adyenClient.getOrCreateShopper(ctx, {
      userId: shopperReference,
      email: identity?.email ?? (shopperReference === "guest_shopper_1" ? "guest@example.com" : undefined),
      name: identity?.name ?? (shopperReference === "guest_shopper_1" ? "Guest Shopper" : undefined),
    });

    return await adyenClient.createCheckoutSession(ctx, {
      amount: args.amount,
      currency: args.currency,
      successUrl: `${getAppUrl()}/?success=true`,
      cancelUrl: `${getAppUrl()}/?canceled=true`,
      shopperReference: shopperResult.shopperReference,
      autoCapture: args.autoCapture,
    });
  },
});

// 3. Sync stored payment methods
export const syncPaymentMethods = action({
  args: {
    shopperReference: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.listStoredPaymentMethods(ctx, {
      shopperReference: args.shopperReference,
    });
  },
});

// 4. Delete stored payment method
export const deletePaymentMethod = action({
  args: {
    shopperReference: v.string(),
    recurringDetailReference: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.deleteStoredPaymentMethod(ctx, {
      shopperReference: args.shopperReference,
      recurringDetailReference: args.recurringDetailReference,
    });
  },
});

// 5. Charge stored card
export const chargeCard = action({
  args: {
    shopperReference: v.string(),
    recurringDetailReference: v.string(),
    amount: v.number(),
    currency: v.string(),
    autoCapture: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await adyenClient.chargeStoredCard(ctx, {
      shopperReference: args.shopperReference,
      recurringDetailReference: args.recurringDetailReference,
      amount: args.amount,
      currency: args.currency,
      autoCapture: args.autoCapture,
    });
  },
});

// 6. Capture payment
export const capture = action({
  args: {
    pspReference: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.capturePayment(ctx, {
      pspReference: args.pspReference,
      amount: args.amount,
      currency: args.currency,
    });
  },
});

// 7. Refund payment
export const refund = action({
  args: {
    pspReference: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.refundPayment(ctx, {
      pspReference: args.pspReference,
      amount: args.amount,
      currency: args.currency,
    });
  },
});

// 8. Cancel payment
export const cancel = action({
  args: {
    pspReference: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.cancelPayment(ctx, {
      pspReference: args.pspReference,
    });
  },
});
