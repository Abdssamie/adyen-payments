"use node";

import { Client, CheckoutAPI } from "@adyen/api-library";
import type {
  CreateCheckoutSessionRequest,
  PaymentRequest,
} from "@adyen/api-library/lib/src/typings/checkout/models.js";
import { v } from "convex/values";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

// Convenient types for ctx args, matching Stripe component
type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;
type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;

export type AdyenComponent = ComponentApi;

export interface AdyenPaymentsOptions {
  ADYEN_API_KEY?: string;
  ADYEN_MERCHANT_ACCOUNT?: string;
  ADYEN_ENVIRONMENT?: "TEST" | "LIVE";
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

  constructor(
    public component: AdyenComponent,
    options?: AdyenPaymentsOptions
  ) {
    this._apiKey = options?.ADYEN_API_KEY ?? process.env.ADYEN_API_KEY!;
    this._merchantAccount =
      options?.ADYEN_MERCHANT_ACCOUNT ?? process.env.ADYEN_MERCHANT_ACCOUNT!;
    const env = options?.ADYEN_ENVIRONMENT ?? process.env.ADYEN_ENVIRONMENT;
    this._environment = env === "LIVE" ? "LIVE" : "TEST";
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
      metadata?: Record<string, string>;
    }
  ) {
    const checkout = this.getAdyenClient();
    const merchantReference = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const response = await checkout.PaymentsApi.sessions({
      amount: { value: args.amount, currency: args.currency },
      reference: merchantReference,
      merchantAccount: this.merchantAccount,
      returnUrl: args.successUrl,
      shopperReference: args.shopperReference,
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
    const mappedMethods = storedMethods.map((m: any) => ({
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
      .map(({ shopperReference, ...rest }) => rest);

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
      metadata?: Record<string, unknown>;
    }
  ) {
    const checkout = this.getAdyenClient();
    const merchantReference =
      args.reference ?? `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const response = await checkout.PaymentsApi.payments({
      amount: { value: args.amount, currency: args.currency },
      reference: merchantReference,
      merchantAccount: this.merchantAccount,
      shopperReference: args.shopperReference,
      returnUrl: args.returnUrl ?? "https://example.com",
      paymentMethod: {
        type: "scheme",
        storedPaymentMethodId: args.recurringDetailReference,
      } as any,
      shopperInteraction: "ContAuth" as PaymentRequest.ShopperInteractionEnum,
      recurringProcessingModel: "Subscription" as PaymentRequest.RecurringProcessingModelEnum,
    });

    const status =
      response.resultCode === "Authorised"
        ? "authorised"
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
