# Convex Adyen Payments

[![npm version](https://badge.fury.io/js/@abdssamie%2Fadyen-payments.svg)](https://badge.fury.io/js/@abdssamie%2Fadyen-payments)

A Convex component that integrates your application with **Adyen Payments**. It enables checkout sessions (supporting the Adyen Drop-in & Web Components SDK), secure payment tokenization for recurring billing, and automatic database updates via HMAC-validated webhooks.

---

## 🚀 Installation

Install the package in your project:

```sh
npm install @abdssamie/adyen-payments
# or
pnpm add @abdssamie/adyen-payments
```

Create or update your `convex/convex.config.ts` file to import and use the component:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import adyenPayments from "@abdssamie/adyen-payments/convex.config.js";

const app = defineApp();
app.use(adyenPayments);

export default app;
```

---

## 🔑 Environment Variables & Dashboard Configuration

The component requires the following environment variables. Set them in your Convex dashboard under **Settings** > **Environment Variables** or locally in `.env.local`:

| Environment Variable | Description |
| :--- | :--- |
| `ADYEN_API_KEY` | Server-side API key for executing requests (e.g. `AQEy...`). |
| `ADYEN_MERCHANT_ACCOUNT` | The merchant account code (e.g. `CompanyAccountECOM`). |
| `ADYEN_ENVIRONMENT` | Set to `TEST` for sandbox testing, or `LIVE` for production. |
| `ADYEN_HMAC_KEY` | HMAC signature key for validating incoming webhook authenticity. |
| `APP_URL` | Base URL of your app (e.g. `https://myapp.com` or `http://localhost:3000`). |

### How to Get Your Credentials from the Adyen Customer Area

#### 1. Retrieve the Merchant Account Name
1. Log in to the [Adyen Customer Area](https://ca-live.adyen.com/ca/ca/login.shtml) (use sandbox for testing, live for production).
2. Click the account switcher in the top-left corner.
3. Toggle to your specific **Merchant Account** (which handles payments) rather than the **Company Account** (used for administration).
4. Copy the unique account name/code. This is your `ADYEN_MERCHANT_ACCOUNT`.

#### 2. Generate an API Key
1. In the account switcher, select your **Company Account** level.
2. In the sidebar, navigate to **Developers** > **API credentials**.
3. Select your integration's web service user (typically starting with `ws@Company.[YourCompanyAccount]`).
4. Under **Server settings** > **Authentication**, click the **API key** tab.
5. Click **Generate API key**.
6. **Important**: Copy this key immediately and store it securely. You cannot view it again once you navigate away. Click **Save changes** at the bottom of the page.

#### 3. Set Up Webhooks & Generate an HMAC Key
1. Select your specific **Merchant Account** in the switcher.
2. Go to **Developers** > **Webhooks** in the sidebar.
3. Click **+ Webhook** on the top-right.
4. Select **Standard Webhook** and click **Add**.
5. Set the **Server URL** to your Convex deployment site endpoint (e.g., `https://<your-deployment>.convex.site/adyen/webhooks`).
6. Scroll down to the **Security** tab and click **Generate** under the HMAC Key section.
7. Copy the generated HMAC key. This is your `ADYEN_HMAC_KEY`.
8. Ensure the webhook state is toggled to **Active** and click **Save configuration**.

---

## 💻 Usage

To use the client, import `AdyenPayments` and initialize it with your registered component:

```ts
import { AdyenPayments } from "@abdssamie/adyen-payments";
import { components } from "./_generated/api";

const adyenClient = new AdyenPayments(components.adyenPayments, {
  autoCapture: true, // If true (default), capture immediately. Set false for manual capture.
});
```

### 1. Initializing Checkout
Create an action in your app's `convex/` folder to initialize a payment checkout session. This provides the `sessionId` and configuration payload required by Adyen's frontend Drop-in/Components SDK.

```ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const startCheckout = action({
  args: {
    amount: v.number(), // Value in minor units (e.g., 1000 for $10.00)
    currency: v.string(), // e.g. "USD", "EUR"
    shopperReference: v.string(), // Unique shopper identifier
  },
  handler: async (ctx, args) => {
    const session = await adyenClient.createCheckoutSession(ctx, {
      amount: args.amount,
      currency: args.currency,
      successUrl: `https://myapp.com/checkout/success`,
      cancelUrl: `https://myapp.com/checkout/cancel`,
      shopperReference: args.shopperReference,
    });
    return session; // Returns { sessionId, sessionData, url? }
  },
});
```

> **Note:** This component supports the Adyen Drop-in and Web Components SDK only. It does not support hosted checkout pages (HPP) or Pay By Link — the `url` field in the session response is optional and `null` for most merchant configurations.

### 2. Charging a Stored Card (Recurring / MIT)
When a shopper pays during checkout and consents to saving their payment details, Adyen stores a token. You can trigger recurring charges from a backend action:

```ts
export const chargeRecurring = action({
  args: {
    shopperReference: v.string(),
    recurringDetailReference: v.string(), // The stored card token
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    return await adyenClient.chargeStoredCard(ctx, {
      shopperReference: args.shopperReference,
      recurringDetailReference: args.recurringDetailReference,
      amount: args.amount,
      currency: args.currency,
    });
  },
});
```

### 3. Payment Modifications (Manual Capture, Refund, Cancel)
If you configure `autoCapture: false` (manual capture), you must manually capture authorizations:

```ts
export const capture = action({
  args: { pspReference: v.string(), amount: v.number(), currency: v.string() },
  handler: async (ctx, args) => {
    return await adyenClient.capturePayment(ctx, args);
  },
});

export const refund = action({
  args: { pspReference: v.string(), amount: v.number(), currency: v.string() },
  handler: async (ctx, args) => {
    return await adyenClient.refundPayment(ctx, args);
  },
});

export const cancel = action({
  args: { pspReference: v.string() },
  handler: async (ctx, args) => {
    return await adyenClient.cancelPayment(ctx, args);
  },
});
```

---

## 🔔 Webhook Integration

Adyen webhooks require a Node.js context because signature verification depends on Node-native packages. Define the handler inside a `"use node"` file, and map it inside your `http.ts` router.

The `events` option in `createWebhookHandler` lets you register custom callback hooks. The `notification` object passed to these callbacks is automatically enriched with the following pre-resolved properties:
* `shopperReference`: The unique shopper identifier (pre-resolved from the checkout session or previous payment records).
* `metadata`: Custom metadata associated with the shopper/payment.
* `isSuccess`: A pre-parsed boolean flag indicating if the event was successful (normalizing the raw string).

This makes it simple to integrate payment infrastructure operations like sending receipt emails, generating invoices, or updating custom app tables right inside the callback handlers.

### 1. Webhook Handler (`convex/adyenWebhooks.ts`)
```ts
"use node";

import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";
import { createWebhookHandler } from "@abdssamie/adyen-payments";
import { v } from "convex/values";

// Create raw handler with custom hooks if needed
const rawHandler = createWebhookHandler(components.adyenPayments, {
  events: {
    AUTHORISATION: async (ctx, notification) => {
      if (notification.isSuccess) {
        console.log(`Payment authorized for shopper: ${notification.shopperReference}`);
        // Add custom code here: send emails, generate invoices, etc.
      }
    },
    CAPTURE: async (ctx, notification) => {
      if (notification.isSuccess) {
        console.log(`Payment captured: ${notification.pspReference} for shopper ${notification.shopperReference}`);
      }
    },
  },
});


export const handleWebhook = internalAction({
  args: { bodyText: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const request = new Request(args.url, {
      method: "POST",
      body: args.bodyText,
      headers: { "Content-Type": "application/json" },
    });

    const response = await rawHandler(ctx, request);
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }
    return await response.text();
  },
});
```

### 2. HTTP Routing (`convex/http.ts`)
```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

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
      console.error("Webhook processing error:", err);
      return new Response("Webhook Error", { status: 400 });
    }
  }),
});

export default http;
```

---

## 🛠️ Developing the Component

To contribute or make changes to the component repository itself, follow these steps to test and compile local changes:

```sh
# Install dependencies
pnpm install

# Run the dev watcher (recompiles the component and runs example backend)
pnpm dev

# Run unit tests
pnpm test

# Lint files
pnpm lint
```
