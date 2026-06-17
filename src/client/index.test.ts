import { describe, expect, test, vi, beforeEach } from "vitest";
import { AdyenPayments, type ActionCtx } from "./index.js";
import { components, initConvexTest } from "./setup.test.js";

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

  class HmacValidatorMock {
    validateHMAC = vi.fn().mockReturnValue(true);
    validateBankingHMAC = vi.fn().mockReturnValue(true);
  }

  return {
    Client: vi.fn(),
    CheckoutAPI: CheckoutAPIMock,
    hmacValidator: HmacValidatorMock,
  };
});

describe("AdyenPayments client class tests", () => {
  beforeEach(() => {
    process.env.ADYEN_API_KEY = "test_key";
    process.env.ADYEN_MERCHANT_ACCOUNT = "test_merchant";
    process.env.APP_URL = "https://example.com";
  });

  test("constructor configuration", () => {
    const client = new AdyenPayments(components.adyenPayments);
    expect(client.apiKey).toBe("test_key");
    expect(client.merchantAccount).toBe("test_merchant");
    expect(client.environment).toBe("TEST");
  });

  test("shopper operations in client context", async () => {
    const t = initConvexTest();
    const payments = new AdyenPayments(components.adyenPayments);

    const shopperRef = await payments.createShopper(t as unknown as ActionCtx, {
      shopperReference: "shopper_1",
      email: "shopper1@example.com",
    });
    expect(shopperRef).toBe("shopper_1");
  });

  test("checkout session creation", async () => {
    const t = initConvexTest();
    const payments = new AdyenPayments(components.adyenPayments);

    const session = await payments.createCheckoutSession(t as unknown as ActionCtx, {
      amount: 1500,
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(session.sessionId).toBe("sess_123");
    expect(session.url).toBe("https://checkout.adyen.com/pay/123");
  });

  test("charging stored payment method", async () => {
    const t = initConvexTest();
    const payments = new AdyenPayments(components.adyenPayments);

    const chargeResult = await payments.chargeStoredCard(t as unknown as ActionCtx, {
      shopperReference: "shopper_1",
      recurringDetailReference: "token_123",
      amount: 5000,
      currency: "EUR",
      autoCapture: false,
    });

    expect(chargeResult.pspReference).toBe("psp_123");
    expect(chargeResult.status).toBe("authorised");
  });

  test("autoCapture and captureDelayHours configuration logic", async () => {
    // 1. Default constructor options
    const clientDefault = new AdyenPayments(components.adyenPayments);
    expect(clientDefault.captureDelayHours).toBe(0);

    // 2. autoCapture: false -> captureDelayHours = -1
    const clientManual = new AdyenPayments(components.adyenPayments, { autoCapture: false });
    expect(clientManual.captureDelayHours).toBe(-1);

    // 3. autoCapture: true -> captureDelayHours = 0
    const clientAuto = new AdyenPayments(components.adyenPayments, { autoCapture: true });
    expect(clientAuto.captureDelayHours).toBe(0);

    // 4. autoCapture: true and captureDelayHours: -1 -> captureDelayHours = 0 (resolved conflict)
    const clientConflict1 = new AdyenPayments(components.adyenPayments, { autoCapture: true, captureDelayHours: -1 });
    expect(clientConflict1.captureDelayHours).toBe(0);

    // 5. autoCapture: true and captureDelayHours: 24 -> captureDelayHours = 24
    const clientConflict2 = new AdyenPayments(components.adyenPayments, { autoCapture: true, captureDelayHours: 24 });
    expect(clientConflict2.captureDelayHours).toBe(24);
  });

  test("createCheckoutSession and chargeStoredCard autoCapture parameters mapping", async () => {
    const t = initConvexTest();
    const payments = new AdyenPayments(components.adyenPayments, { autoCapture: false });

    const { CheckoutAPI } = await import("@adyen/api-library");
    const checkoutInstance = new CheckoutAPI(null as any);
    const sessionsSpy = vi.mocked(checkoutInstance.PaymentsApi.sessions);
    const paymentsSpy = vi.mocked(checkoutInstance.PaymentsApi.payments);

    sessionsSpy.mockClear();
    paymentsSpy.mockClear();

    // 1. Client configured with autoCapture: false, method called without override
    await payments.createCheckoutSession(t as unknown as ActionCtx, {
      amount: 1500,
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });
    expect(sessionsSpy).toHaveBeenCalledWith(expect.objectContaining({
      captureDelayHours: -1,
    }));

    // 2. Client configured with autoCapture: false, method called with override autoCapture: true
    sessionsSpy.mockClear();
    await payments.createCheckoutSession(t as unknown as ActionCtx, {
      amount: 1500,
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      autoCapture: true,
    });
    expect(sessionsSpy).toHaveBeenCalledWith(expect.objectContaining({
      captureDelayHours: 0,
    }));

    // 3. chargeStoredCard client default vs override
    await payments.chargeStoredCard(t as unknown as ActionCtx, {
      shopperReference: "shopper_1",
      recurringDetailReference: "token_123",
      amount: 5000,
      currency: "EUR",
    });
    expect(paymentsSpy).toHaveBeenCalledWith(expect.objectContaining({
      captureDelayHours: -1,
    }));

    paymentsSpy.mockClear();
    await payments.chargeStoredCard(t as unknown as ActionCtx, {
      shopperReference: "shopper_1",
      recurringDetailReference: "token_123",
      amount: 5000,
      currency: "EUR",
      autoCapture: true,
    });
    expect(paymentsSpy).toHaveBeenCalledWith(expect.objectContaining({
      captureDelayHours: 0,
    }));
  });
});
