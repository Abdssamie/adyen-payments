"use node";

import { Client, CheckoutAPI, hmacValidator } from "@adyen/api-library";
import type { Types } from "@adyen/api-library";
import type {
  CreateCheckoutSessionRequest,
  PaymentRequest,
  CardDetails,
  StoredPaymentMethod,
} from "@adyen/api-library/lib/src/typings/checkout/models.js";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
  HttpRouter,
} from "convex/server";
import { httpActionGeneric } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import { NotificationRequestItem } from "@adyen/api-library/lib/src/typings/notification/models.js";

// Convenient types for ctx args, matching Stripe component
export type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
export type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;
export type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;

export type AdyenComponent = ComponentApi;

export const EventCodeEnum = NotificationRequestItem.EventCodeEnum;

export interface AdyenPaymentsOptions {
  ADYEN_API_KEY?: string;
  ADYEN_MERCHANT_ACCOUNT?: string;
  ADYEN_ENVIRONMENT?: "TEST" | "LIVE";
  /**
   * Default delay in hours before capturing the payment.
   * - `0` (default): Capture immediately (Auto-capture).
   * - `-1`: Manual capture (must be captured via API later).
   * - `N` (greater than 0): Capture automatically after N hours.
   */
  captureDelayHours?: number;
  /**
   * Whether to capture the payment automatically.
   * If true (default), capture immediately.
   * If false, perform manual capture (must be captured via API later).
   */
  autoCapture?: boolean;
}

/**
 * Adyen Payments Client
 *
 * Provides methods for managing shoppers, stored card payment methods,
 * and performing checkout sessions or payments via the Adyen API.
 */
export class AdyenPayments {
  private _apiKey: string;
  private _merchantAccount: string;
  private _environment: "TEST" | "LIVE";
  public captureDelayHours: number;

  constructor(
    public component: AdyenComponent,
    options?: AdyenPaymentsOptions
  ) {
    this._apiKey = options?.ADYEN_API_KEY ?? process.env.ADYEN_API_KEY!;
    this._merchantAccount =
      options?.ADYEN_MERCHANT_ACCOUNT ?? process.env.ADYEN_MERCHANT_ACCOUNT!;
    const env = options?.ADYEN_ENVIRONMENT ?? process.env.ADYEN_ENVIRONMENT;
    this._environment = env === "LIVE" ? "LIVE" : "TEST";
    if (options?.autoCapture === false) {
      this.captureDelayHours = -1;
    } else if (options?.autoCapture === true && options?.captureDelayHours === -1) {
      this.captureDelayHours = 0;
    } else {
      this.captureDelayHours = options?.captureDelayHours ?? 0;
    }
  }

  get apiKey(): string {
    if (!this._apiKey) {
      throw new Error("ADYEN_API_KEY environment variable is not set");
    }
    return this._apiKey;
  }

  get merchantAccount(): string {
    if (!this._merchantAccount) {
      throw new Error("ADYEN_MERCHANT_ACCOUNT environment variable is not set");
    }
    return this._merchantAccount;
  }

  get environment(): "TEST" | "LIVE" {
    return this._environment;
  }

  /**
   * Helper to initialize the official Adyen SDK Client
   */
  private getAdyenClient(): CheckoutAPI {
    const client = new Client({
      apiKey: this.apiKey,
      environment: this.environment,
    });
    return new CheckoutAPI(client);
  }

  // ============================================================================
  // SHOPPER MANAGEMENT
  // ============================================================================

  /**
   * Manually create or update a shopper mapping in the database.
   */
  async createShopper(
    ctx: ActionCtx,
    args: {
      shopperReference: string;
      email?: string;
      name?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    return await ctx.runMutation(this.component.public.createOrUpdateShopper, {
      shopperReference: args.shopperReference,
      email: args.email,
      name: args.name,
      userId: args.userId,
      metadata: args.metadata,
    });
  }

  /**
   * Get or create a shopper for a user ID.
   * Checks database indexes first to avoid creating duplicates.
   */
  async getOrCreateShopper(
    ctx: ActionCtx,
    args: {
      userId: string;
      email?: string;
      name?: string;
    }
  ): Promise<{ shopperReference: string; isNew: boolean }> {
    // Check by user ID first
    const existingByUserId = await ctx.runQuery(
      this.component.public.getShopperByUserId,
      { userId: args.userId }
    );
    if (existingByUserId) {
      return { shopperReference: existingByUserId.shopperReference, isNew: false };
    }

    // Check by email second
    if (args.email) {
      const existingByEmail = await ctx.runQuery(
        this.component.public.getShopperByEmail,
        { email: args.email }
      );
      if (existingByEmail) {
        return { shopperReference: existingByEmail.shopperReference, isNew: false };
      }
    }

    // Otherwise, create a new shopper mapping using the userId as shopperReference
    await ctx.runMutation(this.component.public.createOrUpdateShopper, {
      shopperReference: args.userId,
      userId: args.userId,
      email: args.email,
      name: args.name,
    });

    return { shopperReference: args.userId, isNew: true };
  }

  // ============================================================================
  // CHECKOUT SESSIONS
  // ============================================================================

  /**
   * Create an Adyen Checkout Session to initialize Drop-in/Components SDK.
   */
  async createCheckoutSession(
    ctx: ActionCtx,
    args: {
      amount: number; // minor units
      currency: string;
      successUrl: string;
      cancelUrl: string;
      shopperReference?: string;
      captureDelayHours?: number;
      autoCapture?: boolean;
      metadata?: Record<string, string>;
    }
  ) {
    const checkout = this.getAdyenClient();
    const merchantReference = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let captureDelayHours = args.captureDelayHours;
    if (args.autoCapture === false) {
      captureDelayHours = -1;
    } else if (args.autoCapture === true) {
      if (captureDelayHours === undefined || captureDelayHours === -1) {
        captureDelayHours = 0;
      }
    } else if (captureDelayHours === undefined) {
      captureDelayHours = this.captureDelayHours;
    }

    const response = await checkout.PaymentsApi.sessions({
      amount: { value: args.amount, currency: args.currency },
      reference: merchantReference,
      merchantAccount: this.merchantAccount,
      returnUrl: args.successUrl,
      shopperReference: args.shopperReference,
      captureDelayHours: captureDelayHours,
      // If shopper is logged in, enable saved payment methods and ask for consent
      ...(args.shopperReference && {
        storePaymentMethodMode: "askForConsent" as CreateCheckoutSessionRequest.StorePaymentMethodModeEnum,
        recurringProcessingModel: "Subscription" as CreateCheckoutSessionRequest.RecurringProcessingModelEnum,
      }),
    });

    // Persist session locally
    await ctx.runMutation(this.component.private.insertCheckoutSession, {
      sessionId: response.id,
      sessionData: response.sessionData || "",
      shopperReference: args.shopperReference,
      merchantReference,
      amount: args.amount,
      currency: args.currency,
      url: response.url || undefined,
      autoCapture: captureDelayHours === 0,
    });

    return {
      sessionId: response.id,
      sessionData: response.sessionData || "",
      url: response.url || null,
      merchantReference,
    };
  }

  // ============================================================================
  // STORED PAYMENT DETAILS
  // ============================================================================

  /**
   * Retrieve and sync tokenized payment methods stored for a shopper.
   */
  async listStoredPaymentMethods(
    ctx: ActionCtx,
    args: { shopperReference: string }
  ) {
    const checkout = this.getAdyenClient();

    const response = await checkout.PaymentsApi.paymentMethods({
      merchantAccount: this.merchantAccount,
      shopperReference: args.shopperReference,
    });

    const storedMethods = response.storedPaymentMethods || [];
    const mappedMethods = storedMethods.map((m: StoredPaymentMethod) => ({
      recurringDetailReference: m.id || "",
      variant: m.brand || m.type || "unknown",
      cardLast4: m.lastFour || undefined,
      cardExpiryMonth: m.expiryMonth || undefined,
      cardExpiryYear: m.expiryYear || undefined,
    }));

    // Update database state
    await ctx.runMutation(this.component.private.syncPaymentMethods, {
      shopperReference: args.shopperReference,
      paymentMethods: mappedMethods,
    });

    return mappedMethods;
  }

  /**
   * Disable/delete a stored payment method token in Adyen and local database.
   */
  async deleteStoredPaymentMethod(
    ctx: ActionCtx,
    args: { shopperReference: string; recurringDetailReference: string }
  ): Promise<null> {
    const checkout = this.getAdyenClient();

    await checkout.RecurringApi.deleteTokenForStoredPaymentDetails(
      args.recurringDetailReference,
      args.shopperReference,
      this.merchantAccount
    );

    // Retrieve current methods, filter out the disabled one, and sync db
    const currentMethods = await ctx.runQuery(
      this.component.public.listPaymentMethods,
      { shopperReference: args.shopperReference }
    );

    const updatedMethods = currentMethods
      .filter((m) => m.recurringDetailReference !== args.recurringDetailReference)
      .map(({ shopperReference: _shopperReference, ...rest }) => rest);

    await ctx.runMutation(this.component.private.syncPaymentMethods, {
      shopperReference: args.shopperReference,
      paymentMethods: updatedMethods,
    });

    return null;
  }

  // ============================================================================
  // RECURRING CHARGES & PAYMENTS
  // ============================================================================

  /**
   * Charge a stored payment method token (Merchant Initiated Transaction / Subscription).
   */
  async chargeStoredCard(
    ctx: ActionCtx,
    args: {
      shopperReference: string;
      recurringDetailReference: string;
      amount: number; // minor units
      currency: string;
      reference?: string;
      returnUrl?: string;
      captureDelayHours?: number;
      autoCapture?: boolean;
      metadata?: Record<string, unknown>;
    }
  ) {
    const checkout = this.getAdyenClient();
    const merchantReference =
      args.reference ?? `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const returnUrl = args.returnUrl ?? process.env.APP_URL;
    if (!returnUrl) {
      throw new Error(
        "returnUrl must be provided in chargeStoredCard arguments or configured via the APP_URL environment variable"
      );
    }

    let captureDelayHours = args.captureDelayHours;
    if (args.autoCapture === false) {
      captureDelayHours = -1;
    } else if (args.autoCapture === true) {
      if (captureDelayHours === undefined || captureDelayHours === -1) {
        captureDelayHours = 0;
      }
    } else if (captureDelayHours === undefined) {
      captureDelayHours = this.captureDelayHours;
    }

    const response = await checkout.PaymentsApi.payments({
      amount: { value: args.amount, currency: args.currency },
      reference: merchantReference,
      merchantAccount: this.merchantAccount,
      shopperReference: args.shopperReference,
      returnUrl,
      paymentMethod: {
        type: "scheme" as CardDetails.TypeEnum,
        storedPaymentMethodId: args.recurringDetailReference,
      } as CardDetails,
      shopperInteraction: "ContAuth" as PaymentRequest.ShopperInteractionEnum,
      recurringProcessingModel: "Subscription" as PaymentRequest.RecurringProcessingModelEnum,
      captureDelayHours: captureDelayHours,
    });

    const isAutoCapture = captureDelayHours === 0;
    const status =
      response.resultCode === "Authorised"
        ? (isAutoCapture ? "captured" : "authorised")
        : response.resultCode?.toLowerCase() || "refused";

    // Record transaction
    await ctx.runMutation(this.component.private.recordPayment, {
      pspReference: response.pspReference || "unknown",
      shopperReference: args.shopperReference,
      merchantReference,
      amount: args.amount,
      currency: args.currency,
      status,
      paymentMethod: response.paymentMethod?.type || "scheme",
      metadata: args.metadata,
    });

    return {
      pspReference: response.pspReference || null,
      status,
      resultCode: response.resultCode || "Refused",
      merchantReference,
    };
  }

  // ============================================================================
  // PAYMENT MODIFICATIONS
  // ============================================================================

  /**
   * Capture an authorised payment.
   */
  async capturePayment(
    ctx: ActionCtx,
    args: {
      pspReference: string;
      amount: number;
      currency: string;
    }
  ) {
    const checkout = this.getAdyenClient();

    const response = await checkout.ModificationsApi.captureAuthorisedPayment(
      args.pspReference,
      {
        merchantAccount: this.merchantAccount,
        amount: { value: args.amount, currency: args.currency },
      }
    );

    await ctx.runMutation(this.component.private.updatePaymentStatus, {
      pspReference: args.pspReference,
      status: "captured",
    });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }

  /**
   * Refund a captured payment.
   */
  async refundPayment(
    ctx: ActionCtx,
    args: {
      pspReference: string;
      amount: number;
      currency: string;
    }
  ) {
    const checkout = this.getAdyenClient();

    const response = await checkout.ModificationsApi.refundCapturedPayment(
      args.pspReference,
      {
        merchantAccount: this.merchantAccount,
        amount: { value: args.amount, currency: args.currency },
      }
    );

    await ctx.runMutation(this.component.private.updatePaymentStatus, {
      pspReference: args.pspReference,
      status: "refunded",
    });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }

  /**
   * Cancel an uncaptured authorized payment.
   */
  async cancelPayment(
    ctx: ActionCtx,
    args: {
      pspReference: string;
    }
  ) {
    const checkout = this.getAdyenClient();

    const response = await checkout.ModificationsApi.cancelAuthorisedPaymentByPspReference(
      args.pspReference,
      { merchantAccount: this.merchantAccount }
    );

    await ctx.runMutation(this.component.private.updatePaymentStatus, {
      pspReference: args.pspReference,
      status: "cancelled",
    });

    return {
      pspReference: response.pspReference,
      status: response.status,
    };
  }
}

export type AdyenNotificationItem = Types.notification.NotificationRequestItem & {
  shopperReference?: string;
};

export interface AdyenEventHandlers {
  [eventCode: string]: (
    ctx: ActionCtx,
    notification: AdyenNotificationItem
  ) => Promise<void>;
}

export interface RegisterRoutesConfig {
  webhookPath?: string;
  ADYEN_HMAC_KEY?: string;
  events?: AdyenEventHandlers;
  onNotification?: (
    ctx: ActionCtx,
    notification: AdyenNotificationItem
  ) => Promise<void>;
}

/**
 * Creates a raw webhook handler function for use with `httpAction` in a
 * `"use node"` file.
 *
 * Because `http.ts` cannot have the `"use node"` directive, the recommended
 * pattern is:
 *
 * ```ts
 * // adyenWebhooks.ts  — "use node"
 * import { httpAction } from "./_generated/server";
 * import { components } from "./_generated/api";
 * import { createWebhookHandler } from "@abdssamie/adyen-payments";
 *
 * export const webhookHandler = httpAction(
 *   createWebhookHandler(components.adyenPayments, { ... })
 * );
 *
 * // http.ts  — no directive
 * import { httpRouter } from "convex/server";
 * import { webhookHandler } from "./adyenWebhooks";
 *
 * const http = httpRouter();
 * http.route({ path: "/adyen/webhooks", method: "POST", handler: webhookHandler });
 * export default http;
 * ```
 */
export function createWebhookHandler(
  component: AdyenComponent,
  config?: Omit<RegisterRoutesConfig, "webhookPath">
): (
  ctx: GenericActionCtx<GenericDataModel>,
  req: Request
) => Promise<Response> {
  const eventHandlers = config?.events ?? {};

  return async (ctx, req) => {
    const hmacKey = config?.ADYEN_HMAC_KEY || process.env.ADYEN_HMAC_KEY;

    if (!hmacKey) {
      console.error("❌ ADYEN_HMAC_KEY is not set");
      return new Response("HMAC key not configured", { status: 500 });
    }

    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch (err) {
      console.error("❌ Failed to read request body:", err);
      return new Response("Failed to read body", { status: 400 });
    }

    let payload: {
      notificationItems?: Array<{
        NotificationRequestItem?: AdyenNotificationItem;
      }>;
    };
    try {
      payload = JSON.parse(bodyText);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err);
      return new Response("Invalid JSON", { status: 400 });
    }

    const notificationItems = payload.notificationItems;
    if (!Array.isArray(notificationItems)) {
      console.error("❌ Invalid Adyen notification format");
      return new Response("Invalid notification format", { status: 400 });
    }

    const validator = new hmacValidator();

    for (const wrapper of notificationItems) {
      const item = wrapper.NotificationRequestItem;
      if (!item) continue;

      // Verify HMAC signature
      let isValid = false;
      try {
        isValid = validator.validateHMAC(item, hmacKey);
      } catch (err) {
        console.error("❌ HMAC validation threw an error:", err);
      }

      if (!isValid) {
        console.error(
          "❌ Adyen Webhook signature verification failed for PSP:",
          item.pspReference
        );
        return new Response("Invalid signature", { status: 401 });
      }

      // Process notification with default DB sync handler
      try {
        await processNotification(ctx, component, item);

        // Call generic handler if provided
        if (config?.onNotification) {
          await config.onNotification(ctx, item);
        }

        // Call custom event-specific handler if provided
        const eventCode = item.eventCode as unknown as string;
        const customHandler = eventHandlers[eventCode];
        if (customHandler) {
          await customHandler(ctx, item);
        }
      } catch (err) {
        console.error("❌ Error processing webhook notification:", err);
        return new Response("Error processing notification", { status: 500 });
      }
    }

    // Adyen requires returning "[accepted]" to acknowledge receipt
    return new Response("[accepted]", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  };
}

/**
 * Convenience helper that registers the Adyen webhook route directly on an
 * `HttpRouter`.
 *
 * @deprecated Prefer `createWebhookHandler` + `httpAction` in a `"use node"`
 * file — see the `createWebhookHandler` JSDoc for the recommended pattern.
 * This function must be called from a `"use node"` file when used.
 */
export function registerRoutes(
  http: HttpRouter,
  component: AdyenComponent,
  config?: RegisterRoutesConfig
) {
  const webhookPath = config?.webhookPath ?? "/adyen/webhooks";
  const { webhookPath: _drop, ...handlerConfig } = config ?? {};

  http.route({
    path: webhookPath,
    method: "POST",
    handler: httpActionGeneric(createWebhookHandler(component, handlerConfig)),
  });
}

async function processNotification(
  ctx: ActionCtx,
  component: AdyenComponent,
  item: AdyenNotificationItem
): Promise<void> {
  const eventCode = item.eventCode;
  const success = (item.success as unknown as string) === "true";
  const pspReference = item.pspReference;
  const originalReference = item.originalReference;
  const merchantReference = item.merchantReference;
  const amountValue = item.amount?.value;
  const amountCurrency = item.amount?.currency;

  let shopperReference = item.shopperReference;
  let isAutoCapture = false;
  if (merchantReference) {
    const session = await ctx.runQuery(
      component.public.getCheckoutSessionByMerchantReference,
      { merchantReference }
    );
    if (session) {
      if (session.shopperReference) {
        shopperReference = session.shopperReference;
      }
      isAutoCapture = session.autoCapture ?? false;
    }
  }

  switch (eventCode) {
    case EventCodeEnum.Authorisation: {
      console.log("📥 AUTHORISATION webhook incoming payload:", JSON.stringify(item, null, 2));
      const status = success
        ? (isAutoCapture ? "captured" : "authorised")
        : "refused";

      await ctx.runMutation(component.private.recordPayment, {
        pspReference,
        originalReference,
        merchantReference,
        amount: amountValue ?? 0,
        currency: amountCurrency ?? "unknown",
        status,
        paymentMethod: item.paymentMethod,
        shopperReference,
      });

      if (merchantReference) {
        const sessionStatus = success ? "completed" : "refused";
        await ctx.runMutation(component.private.updateCheckoutSessionStatus, {
          merchantReference,
          status: sessionStatus,
        });
      }

      if (success && item.additionalData) {
        const recurringDetailReference = item.additionalData["recurring.recurringDetailReference"];
        const variant = item.additionalData["paymentMethod"] || item.paymentMethod || "scheme";
        const cardLast4 = item.additionalData["cardSummary"];

        const expiryDate = item.additionalData["expiryDate"];
        let cardExpiryMonth: string | undefined;
        let cardExpiryYear: string | undefined;
        if (expiryDate && expiryDate.includes("/")) {
          const parts = expiryDate.split("/");
          cardExpiryMonth = parts[0];
          cardExpiryYear = parts[1];
        }

        if (recurringDetailReference && shopperReference) {
          await ctx.runMutation(component.private.insertPaymentMethod, {
            shopperReference,
            recurringDetailReference,
            variant,
            cardLast4,
            cardExpiryMonth,
            cardExpiryYear,
          });
        }
      }
      break;
    }

    case EventCodeEnum.RecurringContract: {
      if (success && item.additionalData && shopperReference) {
        const recurringDetailReference = item.additionalData["recurring.recurringDetailReference"];
        const variant = item.additionalData["paymentMethod"] || item.paymentMethod || "scheme";
        const cardLast4 = item.additionalData["cardSummary"];

        const expiryDate = item.additionalData["expiryDate"];
        let cardExpiryMonth: string | undefined;
        let cardExpiryYear: string | undefined;
        if (expiryDate && expiryDate.includes("/")) {
          const parts = expiryDate.split("/");
          cardExpiryMonth = parts[0];
          cardExpiryYear = parts[1];
        }

        if (recurringDetailReference) {
          await ctx.runMutation(component.private.insertPaymentMethod, {
            shopperReference,
            recurringDetailReference,
            variant,
            cardLast4,
            cardExpiryMonth,
            cardExpiryYear,
          });
        }
      }
      break;
    }

    case EventCodeEnum.Capture: {
      const status = success ? "captured" : "capture_failed";
      const targetReference = originalReference || pspReference;
      await ctx.runMutation(component.private.updatePaymentStatus, {
        pspReference: targetReference,
        status,
        originalReference: pspReference,
      });
      break;
    }

    case EventCodeEnum.Refund: {
      const status = success ? "refunded" : "refund_failed";
      const targetReference = originalReference || pspReference;
      await ctx.runMutation(component.private.updatePaymentStatus, {
        pspReference: targetReference,
        status,
        originalReference: pspReference,
      });
      break;
    }

    case EventCodeEnum.Cancellation: {
      const status = success ? "cancelled" : "cancel_failed";
      const targetReference = originalReference || pspReference;
      await ctx.runMutation(component.private.updatePaymentStatus, {
        pspReference: targetReference,
        status,
        originalReference: pspReference,
      });
      break;
    }

    case EventCodeEnum.CancelOrRefund: {
      if (success) {
        const action = item.additionalData?.["modification.action"];
        const status = action === "cancel" ? "cancelled" : "refunded";
        const targetReference = originalReference || pspReference;
        await ctx.runMutation(component.private.updatePaymentStatus, {
          pspReference: targetReference,
          status,
          originalReference: pspReference,
        });
      }
      break;
    }
  }
}
