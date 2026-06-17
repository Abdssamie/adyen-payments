import { httpRouter } from "convex/server";
import { webhookHandler } from "./adyenWebhooks.js";

const http = httpRouter();

/**
 * Register the Adyen webhook endpoint.
 * The handler lives in adyenWebhooks.ts ("use node") because it uses
 * @adyen/api-library which requires Node built-ins (crypto/assert/events).
 * Webhook URL: https://<deployment>.convex.site/adyen/webhooks
 */
http.route({
  path: "/adyen/webhooks",
  method: "POST",
  handler: webhookHandler,
});

export default http;
