import { beforeEach, describe, expect, test, vi } from "vitest";
import { initConvexTest } from "./setup.test.js";
import { api } from "./_generated/api.js";

// Mock the Adyen SDK API calls
vi.mock("@adyen/api-library", () => {
  const sessionsMock = vi.fn().mockResolvedValue({
    id: "sess_123",
    sessionData: "data_blob_123",
    url: "https://checkout.adyen.com/pay/123",
  });

  const paymentMethodsMock = vi.fn().mockResolvedValue({
    storedPaymentMethods: [
      { id: "token_123", brand: "visa", lastFour: "1111", expiryMonth: "12", expiryYear: "2030" }
    ]
  });

  const deleteStoredPaymentMethodMock = vi.fn().mockResolvedValue({});

  const paymentsMock = vi.fn().mockResolvedValue({
    pspReference: "psp_123",
    resultCode: "Authorised",
    paymentMethod: { type: "visa" }
  });

  const captureMock = vi.fn().mockResolvedValue({ pspReference: "psp_cap_123", status: "received" });
  const refundMock = vi.fn().mockResolvedValue({ pspReference: "psp_ref_123", status: "received" });
  const cancelMock = vi.fn().mockResolvedValue({ pspReference: "psp_can_123", status: "received" });

  class CheckoutAPIMock {
    PaymentsApi = {
      sessions: sessionsMock,
      payments: paymentsMock,
      paymentMethods: paymentMethodsMock,
    };
    RecurringApi = {
      deleteTokenForStoredPaymentDetails: deleteStoredPaymentMethodMock,
    };
    ModificationsApi = {
      captureAuthorisedPayment: captureMock,
      refundCapturedPayment: refundMock,
      cancelAuthorisedPaymentByPspReference: cancelMock,
    };
  }

  return {
    Client: vi.fn(),
    CheckoutAPI: CheckoutAPIMock,
  };
});

describe("example app tests", () => {
  beforeEach(() => {
    process.env.ADYEN_API_KEY = "test_key";
    process.env.ADYEN_MERCHANT_ACCOUNT = "test_account";
    process.env.APP_URL = "http://localhost:3000";
  });

  test("getOrCreateShopper", async () => {
    const t = initConvexTest().withIdentity({
      subject: "user_123",
      email: "user@example.com",
      name: "User One",
    });

    const shopperResult = await t.action(api.example.getOrCreateShopper, {});
    expect(shopperResult.shopperReference).toBe("user_123");
    expect(shopperResult.isNew).toBe(true);
  });

  test("checkout flow and payments", async () => {
    const t = initConvexTest().withIdentity({
      subject: "user_123",
      email: "user@example.com",
      name: "User One",
    });

    // Create a checkout session
    const session = await t.action(api.example.createCheckout, {
      amount: 1000,
      currency: "EUR",
    });
    expect(session.sessionId).toBe("sess_123");
    expect(session.url).toBe("https://checkout.adyen.com/pay/123");

    // List stored payment methods
    const methods = await t.action(api.example.syncPaymentMethods, {
      shopperReference: "user_123",
    });
    expect(methods).toHaveLength(1);
    expect(methods[0].recurringDetailReference).toBe("token_123");

    // Charge stored card
    const payment = await t.action(api.example.chargeCard, {
      shopperReference: "user_123",
      recurringDetailReference: "token_123",
      amount: 1000,
      currency: "EUR",
      autoCapture: false,
    });
    expect(payment.pspReference).toBe("psp_123");
    expect(payment.status).toBe("authorised");

    // Capture payment
    const captureResult = await t.action(api.example.capture, {
      pspReference: "psp_123",
      amount: 1000,
      currency: "EUR",
    });
    expect(captureResult.pspReference).toBe("psp_cap_123");

    // Refund payment
    const refundResult = await t.action(api.example.refund, {
      pspReference: "psp_123",
      amount: 1000,
      currency: "EUR",
    });
    expect(refundResult.pspReference).toBe("psp_ref_123");

    // Cancel payment
    const cancelResult = await t.action(api.example.cancel, {
      pspReference: "psp_123",
    });
    expect(cancelResult.pspReference).toBe("psp_can_123");
  });
});
