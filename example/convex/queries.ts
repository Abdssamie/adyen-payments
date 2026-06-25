import { query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { v } from "convex/values";

export const getShopper = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(components.adyenPayments.public.getShopper, {
      shopperReference: identity.subject,
    });
  },
});

export const listPaymentMethods = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.runQuery(components.adyenPayments.public.listPaymentMethods, {
      shopperReference: identity.subject,
    });
  },
});

export const listPayments = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.runQuery(components.adyenPayments.public.listPayments, {
      shopperReference: identity.subject,
    });
  },
});

export const getCheckoutSession = query({
  args: { merchantReference: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(components.adyenPayments.public.getCheckoutSessionByMerchantReference, {
      merchantReference: args.merchantReference,
    });
  },
});
