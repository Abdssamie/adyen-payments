import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

/**
 * Register the Adyen webhook endpoint.
 * The handler logic is executed inside a Node.js action to support the
 * @adyen/api-library, which depends on Node.js built-ins.
 * Webhook URL: https://<deployment>.convex.site/adyen/webhooks
 */
http.route({
  path: "/adyen/webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const bodyText = await request.text();
    try {
      const responseText = await ctx.runAction(
        internal.adyenWebhooks.handleWebhook,
        { bodyText, url: request.url }
      );
      return new Response(responseText, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("❌ Adyen Webhook Error:", err);
      return new Response("Webhook Error", { status: 400 });
    }
  }),
});

export default http;
