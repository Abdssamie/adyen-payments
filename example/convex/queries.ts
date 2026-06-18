import { query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { v } from "convex/values";

export const getShopper = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.adyenPayments.public.getShopper, {
      shopperReference: args.shopperReference,
    });
  },
});

export const listPaymentMethods = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.adyenPayments.public.listPaymentMethods, {
      shopperReference: args.shopperReference,
    });
  },
});

export const listPayments = query({
  args: { shopperReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.adyenPayments.public.listPayments, {
      shopperReference: args.shopperReference,
    });
  },
});

export const getCheckoutSession = query({
  args: { merchantReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.adyenPayments.public.getCheckoutSessionByMerchantReference, {
      merchantReference: args.merchantReference,
    });
  },
});
