"use node";

import { httpRouter } from "convex/server";
import { components } from "./_generated/api.js";
import { registerRoutes } from "@abdssamie/adyen-payments";

const http = httpRouter();

// Register Adyen webhooks with default DB sync and custom event handlers
// Webhook Endpoint: https://<your-deployment>.convex.site/adyen/webhook
registerRoutes(http, components.adyenPayments, {
  webhookPath: "/adyen/webhooks",
  events: {
    AUTHORISATION: async (ctx, notification) => {
      // Custom handler triggered after database sync completes
      console.log("🔔 Custom Handler: Payment Authorised!", {
        pspReference: notification.pspReference,
        merchantReference: notification.merchantReference,
        amount: notification.amount?.value,
        currency: notification.amount?.currency,
        success: notification.success,
      });
    },
    CAPTURE: async (ctx, notification) => {
      console.log("💰 Custom Handler: Payment Captured!", {
        pspReference: notification.pspReference,
        originalReference: notification.originalReference,
        success: notification.success,
      });
    },
  },
  onNotification: async (ctx, notification) => {
    // Logging all incoming notifications for audit/debugging
    console.log(`📊 Notification received: ${notification.eventCode}`, {
      pspReference: notification.pspReference,
      success: notification.success,
    });
  },
});

export default http;
