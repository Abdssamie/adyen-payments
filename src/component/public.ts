import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import schema from "./schema.js";

// Reusable validators that omit system fields (_id, _creationTime)
const shopperValidator = schema.tables.shoppers.validator;
const paymentMethodValidator = schema.tables.payment_methods.validator;
const paymentValidator = schema.tables.payments.validator;
const checkoutSessionValidator = schema.tables.checkout_sessions.validator;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get a shopper by their shopperReference.
 */
export const getShopper = query({
  args: { shopperReference: v.string() },
  returns: v.union(shopperValidator, v.null()),
  handler: async (ctx, args) => {
    const shopper = await ctx.db
      .query("shoppers")
      .withIndex("by_shopper_reference", (q) =>
        q.eq("shopperReference", args.shopperReference)
      )
      .unique();
    if (!shopper) return null;
    const { _id, _creationTime, ...data } = shopper;
    return data;
  },
});

/**
 * Get a shopper by their email address.
 */
export const getShopperByEmail = query({
  args: { email: v.string() },
  returns: v.union(shopperValidator, v.null()),
  handler: async (ctx, args) => {
    const shopper = await ctx.db
      .query("shoppers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!shopper) return null;
    const { _id, _creationTime, ...data } = shopper;
    return data;
  },
});

/**
 * Get a shopper by their user ID.
 */
export const getShopperByUserId = query({
  args: { userId: v.string() },
  returns: v.union(shopperValidator, v.null()),
  handler: async (ctx, args) => {
    const shopper = await ctx.db
      .query("shoppers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    if (!shopper) return null;
    const { _id, _creationTime, ...data } = shopper;
    return data;
  },
});

/**
 * Get a payment transaction by its PSP reference.
 */
export const getPayment = query({
  args: { pspReference: v.string() },
  returns: v.union(paymentValidator, v.null()),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_psp_reference", (q) =>
        q.eq("pspReference", args.pspReference)
      )
      .unique();
    if (!payment) return null;
    const { _id, _creationTime, ...data } = payment;
    return data;
  },
});

/**
 * List all payments for a shopper.
 */
export const listPayments = query({
  args: { shopperReference: v.string() },
  returns: v.array(paymentValidator),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_shopper_reference", (q) =>
        q.eq("shopperReference", args.shopperReference)
      )
      .collect();
    return payments.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List all payments for an organization ID.
 */
export const listPaymentsByOrgId = query({
  args: { orgId: v.string() },
  returns: v.array(paymentValidator),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
    return payments.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List all payments for a user ID.
 */
export const listPaymentsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(paymentValidator),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return payments.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List stored payment methods for a shopper.
 */
export const listPaymentMethods = query({
  args: { shopperReference: v.string() },
  returns: v.array(paymentMethodValidator),
  handler: async (ctx, args) => {
    const methods = await ctx.db
      .query("payment_methods")
      .withIndex("by_shopper_reference", (q) =>
        q.eq("shopperReference", args.shopperReference)
      )
      .collect();
    return methods.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * Get a checkout session by its session ID.
 */
export const getCheckoutSession = query({
  args: { sessionId: v.string() },
  returns: v.union(checkoutSessionValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!session) return null;
    const { _id, _creationTime, ...data } = session;
    return data;
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create or update a shopper mapping with optional metadata.
 */
export const createOrUpdateShopper = mutation({
  args: {
    shopperReference: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shoppers")
      .withIndex("by_shopper_reference", (q) =>
        q.eq("shopperReference", args.shopperReference)
      )
      .unique();

    if (existing) {
      await ctx.db.patch("shoppers", existing._id, {
        ...(args.email !== undefined && { email: args.email }),
        ...(args.name !== undefined && { name: args.name }),
        ...(args.userId !== undefined && { userId: args.userId }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
      });
    } else {
      await ctx.db.insert("shoppers", {
        shopperReference: args.shopperReference,
        email: args.email,
        name: args.name,
        userId: args.userId,
        metadata: args.metadata,
      });
    }
    return args.shopperReference;
  },
});

/**
 * Get a checkout session by its merchantReference.
 */
export const getCheckoutSessionByMerchantReference = query({
  args: { merchantReference: v.string() },
  returns: v.union(checkoutSessionValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_merchant_reference", (q) =>
        q.eq("merchantReference", args.merchantReference)
      )
      .unique();
    if (!session) return null;
    const { _id, _creationTime, ...data } = session;
    return data;
  },
});
