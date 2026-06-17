"use node";

import { internalAction } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { createWebhookHandler } from "../../src/client/index.js";
import type { ActionCtx, AdyenNotificationItem } from "../../src/client/index.js";
import { v } from "convex/values";

const rawHandler = createWebhookHandler(components.adyenPayments, {
  events: {
    AUTHORISATION: async (_ctx: ActionCtx, notification: AdyenNotificationItem) => {
      console.log("🔔 Custom Handler: Payment Authorised!", {
        pspReference: notification.pspReference,
        merchantReference: notification.merchantReference,
        amount: notification.amount?.value,
        currency: notification.amount?.currency,
        success: notification.success,
      });
    },
    CAPTURE: async (_ctx: ActionCtx, notification: AdyenNotificationItem) => {
      console.log("💰 Custom Handler: Payment Captured!", {
        pspReference: notification.pspReference,
        originalReference: notification.originalReference,
        success: notification.success,
      });
    },
  },
  onNotification: async (_ctx: ActionCtx, notification: AdyenNotificationItem) => {
    // Log all incoming notifications for audit/debugging
    console.log(`📊 Notification received: ${notification.eventCode as unknown as string}`, {
      pspReference: notification.pspReference,
      success: notification.success,
    });
  },
});

/**
 * Adyen webhook internal action.
 *
 * This runs inside the Node.js runtime to validate the HMAC signature
 * of the webhook payload, since validation depends on @adyen/api-library
 * which requires Node built-ins.
 */
export const handleWebhook = internalAction({
  args: {
    bodyText: v.string(),
  },
  handler: async (ctx, args) => {
    const request = new Request("https://localhost/adyen/webhooks", {
      method: "POST",
      body: args.bodyText,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await rawHandler(ctx, request);
    if (!response.ok) {
      throw new Error(`Webhook handler returned status ${response.status}: ${await response.text()}`);
    }
    return await response.text();
  },
});
