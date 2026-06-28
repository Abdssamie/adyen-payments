import { describe, expect, test, vi, beforeEach } from "vitest";
import type { HttpRouter } from "convex/server";
import { registerRoutes, type ActionCtx } from "./index.js";
import { components, initConvexTest } from "./setup.test.js";

// Mock the Adyen SDK hmacValidator
vi.mock("@adyen/api-library", () => {
  class HmacValidatorMock {
    validateHMAC = vi.fn().mockReturnValue(true);
    validateBankingHMAC = vi.fn().mockReturnValue(true);
  }
  return {
    Client: vi.fn(),
    CheckoutAPI: vi.fn(),
    hmacValidator: HmacValidatorMock,
  };
});

describe("Adyen webhook processing tests", () => {
  beforeEach(() => {
    process.env.ADYEN_HMAC_KEY = "test_hmac_key";
  });

  test("route registration and authorisation success with tokenization", async () => {
    const t = initConvexTest();

    // Register routes with a mock HTTP router
    const routes: Array<{ path: string; method: string; handler: (...args: any[]) => any }> = [];
    const mockHttp = {
      route: (r: { path: string; method: string; handler: (...args: any[]) => any }) => {
        routes.push(r);
      },
    } as unknown as HttpRouter;

    const onNotificationSpy = vi.fn();
    const customAuthorisationSpy = vi.fn();

    registerRoutes(mockHttp, components.adyenPayments, {
      webhookPath: "/adyen/webhooks",
      events: {
        AUTHORISATION: customAuthorisationSpy,
      },
      onNotification: onNotificationSpy,
    });

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe("/adyen/webhooks");
    expect(routes[0].method).toBe("POST");

    const handler = routes[0].handler;

    // Simulate an AUTHORISATION notification containing token details
    const request = new Request("https://example.com/adyen/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationItems: [
          {
            NotificationRequestItem: {
              eventCode: "AUTHORISATION",
              pspReference: "psp_auth_1",
              merchantReference: "order_123",
              success: "true",
              amount: { value: 5000, currency: "USD" },
              shopperReference: "user_abc",
              paymentMethod: "visa",
              additionalData: {
                hmacSignature: "mock_signature",
                "recurring.recurringDetailReference": "token_xyz",
                cardSummary: "1111",
                expiryDate: "12/2030",
                paymentMethod: "visa",
              },
            },
          },
        ],
      }),
    });

    const response = await handler(t as unknown as ActionCtx, request);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("[accepted]");

    // Verify DB states: payment transaction was recorded
    const payment = await t.query(components.adyenPayments.public.getPayment, {
      pspReference: "psp_auth_1",
    });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe("authorised");
    expect(payment!.amount).toBe(5000);
    expect(payment!.shopperReference).toBe("user_abc");

    // Verify DB states: payment method card was tokenized
    const methods = await t.query(components.adyenPayments.public.listPaymentMethods, {
      shopperReference: "user_abc",
    });
    expect(methods).toHaveLength(1);
    expect(methods[0].recurringDetailReference).toBe("token_xyz");
    expect(methods[0].cardLast4).toBe("1111");
    expect(methods[0].cardExpiryMonth).toBe("12");
    expect(methods[0].cardExpiryYear).toBe("2030");

    // Verify custom handlers were triggered
    expect(onNotificationSpy).toHaveBeenCalledOnce();
    expect(customAuthorisationSpy).toHaveBeenCalledOnce();
    expect(customAuthorisationSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventCode: "AUTHORISATION",
        shopperReference: "user_abc",
        isSuccess: true,
      })
    );
  });

  test("modification notifications (CAPTURE, REFUND, CANCEL)", async () => {
    const t = initConvexTest();

    // Seed an authorised payment in the database
    await t.mutation(components.adyenPayments.private.recordPayment, {
      pspReference: "psp_auth_2",
      merchantReference: "order_456",
      amount: 1000,
      currency: "EUR",
      status: "authorised",
      shopperReference: "user_def",
    });

    const routes: Array<{ path: string; method: string; handler: (...args: any[]) => any }> = [];
    const mockHttp = {
      route: (r: { path: string; method: string; handler: (...args: any[]) => any }) => {
        routes.push(r);
      },
    } as unknown as HttpRouter;

    const customCaptureSpy = vi.fn();
    const customRefundSpy = vi.fn();

    registerRoutes(mockHttp, components.adyenPayments, {
      events: {
        CAPTURE: customCaptureSpy,
        REFUND: customRefundSpy,
      },
    });
    const handler = routes[0].handler;

    // 1. CAPTURE webhook
    const captureRequest = new Request("https://example.com/adyen/webhooks", {
      method: "POST",
      body: JSON.stringify({
        notificationItems: [
          {
            NotificationRequestItem: {
              eventCode: "CAPTURE",
              pspReference: "psp_cap_2",
              originalReference: "psp_auth_2",
              merchantReference: "order_456",
              success: "true",
              amount: { value: 1000, currency: "EUR" },
            },
          },
        ],
      }),
    });
    await handler(t as unknown as ActionCtx, captureRequest);

    const capturedPayment = await t.query(components.adyenPayments.public.getPayment, {
      pspReference: "psp_auth_2",
    });
    expect(capturedPayment!.status).toBe("captured");
    expect(customCaptureSpy).toHaveBeenCalledOnce();
    expect(customCaptureSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventCode: "CAPTURE",
        shopperReference: "user_def",
        isSuccess: true,
      })
    );

    // 2. REFUND webhook
    const refundRequest = new Request("https://example.com/adyen/webhooks", {
      method: "POST",
      body: JSON.stringify({
        notificationItems: [
          {
            NotificationRequestItem: {
              eventCode: "REFUND",
              pspReference: "psp_ref_2",
              originalReference: "psp_auth_2",
              merchantReference: "order_456",
              success: "true",
              amount: { value: 1000, currency: "EUR" },
            },
          },
        ],
      }),
    });
    await handler(t as unknown as ActionCtx, refundRequest);

    const refundedPayment = await t.query(components.adyenPayments.public.getPayment, {
      pspReference: "psp_auth_2",
    });
    expect(refundedPayment!.status).toBe("refunded");
    expect(customRefundSpy).toHaveBeenCalledOnce();
    expect(customRefundSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventCode: "REFUND",
        shopperReference: "user_def",
        isSuccess: true,
      })
    );
  });
});
