import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shoppers: defineTable({
    shopperReference: v.string(), // Unique key defined by the merchant (e.g. userId)
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_shopper_reference", ["shopperReference"])
    .index("by_email", ["email"])
    .index("by_user_id", ["userId"]),

  // Tokenized payment instruments (stored details)
  payment_methods: defineTable({
    shopperReference: v.string(),
    recurringDetailReference: v.string(), // Token used for recurring charges
    variant: v.string(), // e.g. "visa", "mc", "ideal"
    cardLast4: v.optional(v.string()),
    cardExpiryMonth: v.optional(v.string()),
    cardExpiryYear: v.optional(v.string()),
    status: v.string(), // "active" or "disabled"
    metadata: v.optional(v.any()),
  })
    .index("by_recurring_detail_reference", ["recurringDetailReference"])
    .index("by_shopper_reference", ["shopperReference"]),

  // Transaction history synced from webhooks
  payments: defineTable({
    pspReference: v.string(), // Adyen transaction ID
    originalReference: v.optional(v.string()), // For refunds/captures referencing the auth
    shopperReference: v.optional(v.string()),
    merchantReference: v.string(), // App's order reference
    amount: v.number(), // Value in minor units (e.g. cents)
    currency: v.string(),
    status: v.string(), // "authorised", "captured", "refused", "cancelled", "refunded"
    paymentMethod: v.optional(v.string()),
    created: v.number(),
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_psp_reference", ["pspReference"])
    .index("by_shopper_reference", ["shopperReference"])
    .index("by_merchant_reference", ["merchantReference"])
    .index("by_user_id", ["userId"])
    .index("by_org_id", ["orgId"]),

  // Checkout sessions for payment initialization
  checkout_sessions: defineTable({
    sessionId: v.string(),
    sessionData: v.string(), // Frontend config string
    shopperReference: v.optional(v.string()),
    merchantReference: v.string(),
    status: v.string(), // "active" or "completed"
    amount: v.number(),
    currency: v.string(),
    url: v.optional(v.string()), // Hosted Checkout URL (if applicable)
  })
    .index("by_session_id", ["sessionId"])
    .index("by_shopper_reference", ["shopperReference"])
    .index("by_merchant_reference", ["merchantReference"]),
});

