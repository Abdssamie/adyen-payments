import { v } from "convex/values";
import { mutation } from "./_generated/server.js";

/**
 * Record a newly created checkout session.
 */
export const insertCheckoutSession = mutation({
  args: {
    sessionId: v.string(),
    sessionData: v.string(),
    shopperReference: v.optional(v.string()),
    merchantReference: v.string(),
    amount: v.number(),
    currency: v.string(),
    url: v.optional(v.string()),
    autoCapture: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!existing) {
      await ctx.db.insert("checkout_sessions", {
        sessionId: args.sessionId,
        sessionData: args.sessionData,
        shopperReference: args.shopperReference,
        merchantReference: args.merchantReference,
        status: "active",
        amount: args.amount,
        currency: args.currency,
        url: args.url,
        autoCapture: args.autoCapture,
      });
    }
    return null;
  },
});

/**
 * Record a payment transaction (e.g. authorization success/failure).
 */
export const recordPayment = mutation({
  args: {
    pspReference: v.string(),
    originalReference: v.optional(v.string()),
    shopperReference: v.optional(v.string()),
    merchantReference: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    paymentMethod: v.optional(v.string()),
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_psp_reference", (q) =>
        q.eq("pspReference", args.pspReference)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("payments", {
        pspReference: args.pspReference,
        originalReference: args.originalReference,
        shopperReference: args.shopperReference,
        merchantReference: args.merchantReference,
        amount: args.amount,
        currency: args.currency,
        status: args.status,
        paymentMethod: args.paymentMethod,
        created: Date.now(),
        userId: args.userId,
        orgId: args.orgId,
        metadata: args.metadata,
      });
    } else {
      await ctx.db.patch("payments", existing._id, {
        status: args.status,
        ...(args.shopperReference !== undefined && { shopperReference: args.shopperReference }),
        ...(args.userId !== undefined && { userId: args.userId }),
        ...(args.orgId !== undefined && { orgId: args.orgId }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
      });
    }
    return null;
  },
});

/**
 * Update the status of a payment transaction (e.g. captured, refunded, cancelled).
 */
export const updatePaymentStatus = mutation({
  args: {
    pspReference: v.string(),
    status: v.string(),
    originalReference: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_psp_reference", (q) =>
        q.eq("pspReference", args.pspReference)
      )
      .unique();

    if (payment) {
      await ctx.db.patch("payments", payment._id, {
        status: args.status,
        ...(args.originalReference !== undefined && { originalReference: args.originalReference }),
      });
    } else {
      // If payment is not found locally, create a placeholder payment that will be backfilled/updated.
      // (This handles cases where captures/refunds are triggered but original auth record is not in db)
      await ctx.db.insert("payments", {
        pspReference: args.pspReference,
        originalReference: args.originalReference,
        merchantReference: "unknown",
        amount: 0,
        currency: "unknown",
        status: args.status,
        created: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Insert or update a single tokenized payment method.
 */
export const insertPaymentMethod = mutation({
  args: {
    shopperReference: v.string(),
    recurringDetailReference: v.string(),
    variant: v.string(),
    cardLast4: v.optional(v.string()),
    cardExpiryMonth: v.optional(v.string()),
    cardExpiryYear: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payment_methods")
      .withIndex("by_recurring_detail_reference", (q) =>
        q.eq("recurringDetailReference", args.recurringDetailReference)
      )
      .unique();

    if (existing) {
      await ctx.db.patch("payment_methods", existing._id, {
        status: "active",
        variant: args.variant,
        cardLast4: args.cardLast4,
        cardExpiryMonth: args.cardExpiryMonth,
        cardExpiryYear: args.cardExpiryYear,
        ...(args.metadata !== undefined && { metadata: args.metadata }),
      });
    } else {
      await ctx.db.insert("payment_methods", {
        shopperReference: args.shopperReference,
        recurringDetailReference: args.recurringDetailReference,
        variant: args.variant,
        cardLast4: args.cardLast4,
        cardExpiryMonth: args.cardExpiryMonth,
        cardExpiryYear: args.cardExpiryYear,
        status: "active",
        metadata: args.metadata,
      });
    }
    return null;
  },
});

/**
 * Synchronize the active stored card/payment method tokens for a shopper.
 */
export const syncPaymentMethods = mutation({
  args: {
    shopperReference: v.string(),
    paymentMethods: v.array(
      v.object({
        recurringDetailReference: v.string(),
        variant: v.string(),
        cardLast4: v.optional(v.string()),
        cardExpiryMonth: v.optional(v.string()),
        cardExpiryYear: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all existing payment methods for the shopper
    const existing = await ctx.db
      .query("payment_methods")
      .withIndex("by_shopper_reference", (q) =>
        q.eq("shopperReference", args.shopperReference)
      )
      .collect();

    const incomingRefs = new Set(
      args.paymentMethods.map((m) => m.recurringDetailReference)
    );

    // Mark methods that are no longer active as disabled
    for (const method of existing) {
      if (
        !incomingRefs.has(method.recurringDetailReference) &&
        method.status !== "disabled"
      ) {
        await ctx.db.patch("payment_methods", method._id, { status: "disabled" });
      }
    }

    // Insert or update incoming active methods
    for (const method of args.paymentMethods) {
      const match = existing.find(
        (m) => m.recurringDetailReference === method.recurringDetailReference
      );
      if (match) {
        await ctx.db.patch("payment_methods", match._id, {
          status: "active",
          variant: method.variant,
          cardLast4: method.cardLast4,
          cardExpiryMonth: method.cardExpiryMonth,
          cardExpiryYear: method.cardExpiryYear,
          ...(method.metadata !== undefined && { metadata: method.metadata }),
        });
      } else {
        await ctx.db.insert("payment_methods", {
          shopperReference: args.shopperReference,
          recurringDetailReference: method.recurringDetailReference,
          variant: method.variant,
          cardLast4: method.cardLast4,
          cardExpiryMonth: method.cardExpiryMonth,
          cardExpiryYear: method.cardExpiryYear,
          status: "active",
          metadata: method.metadata,
        });
      }
    }
    return null;
  },
});

/**
 * Update the status of a checkout session.
 */
export const updateCheckoutSessionStatus = mutation({
  args: {
    merchantReference: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_merchant_reference", (q) =>
        q.eq("merchantReference", args.merchantReference)
      )
      .unique();

    if (session) {
      await ctx.db.patch("checkout_sessions", session._id, { status: args.status });
    }
    return null;
  },
});
