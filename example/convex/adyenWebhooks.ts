"use node";

import { httpAction } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { createWebhookHandler } from "../../src/client/index.js";
import type { ActionCtx, AdyenNotificationItem } from "../../src/client/index.js";

/**
 * Adyen webhook HTTP action.
 *
 * This file intentionally has "use node" because createWebhookHandler uses
 * @adyen/api-library (hmacValidator), which depends on Node built-ins
 * (crypto, assert, events). The handler is exported and registered in
 * http.ts which cannot have "use node".
 */
export const webhookHandler = httpAction(
  createWebhookHandler(components.adyenPayments, {
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
  })
);
