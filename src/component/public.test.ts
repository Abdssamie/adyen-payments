import { test, expect } from "vitest";
import { initConvexTest } from "./setup.test.js";
import { api } from "./_generated/api.js";

test("shopper operations", async () => {
  const t = initConvexTest();

  // Create a shopper
  const shopperRef = await t.mutation(api.public.createOrUpdateShopper, {
    shopperReference: "user_123",
    email: "test@example.com",
    name: "Test User",
    userId: "user_123",
    metadata: { plan: "pro" },
  });
  expect(shopperRef).toBe("user_123");

  // Get shopper by shopperReference
  const shopper = await t.query(api.public.getShopper, {
    shopperReference: "user_123",
  });
  expect(shopper).not.toBeNull();
  expect(shopper!.email).toBe("test@example.com");
  expect(shopper!.userId).toBe("user_123");

  // Get shopper by userId
  const shopperByUserId = await t.query(api.public.getShopperByUserId, {
    userId: "user_123",
  });
  expect(shopperByUserId).not.toBeNull();
  expect(shopperByUserId!.shopperReference).toBe("user_123");

  // Get shopper by email
  const shopperByEmail = await t.query(api.public.getShopperByEmail, {
    email: "test@example.com",
  });
  expect(shopperByEmail).not.toBeNull();
  expect(shopperByEmail!.shopperReference).toBe("user_123");
});

test("checkout session operations", async () => {
  const t = initConvexTest();

  await t.mutation(api.private.insertCheckoutSession, {
    sessionId: "sess_123",
    sessionData: "data_blob",
    shopperReference: "user_123",
    merchantReference: "ref_123",
    amount: 1000,
    currency: "EUR",
    url: "https://checkout.adyen.com/pay",
  });

  const session = await t.query(api.public.getCheckoutSession, {
    sessionId: "sess_123",
  });
  expect(session).not.toBeNull();
  expect(session!.amount).toBe(1000);
  expect(session!.url).toBe("https://checkout.adyen.com/pay");
});

test("payment operations", async () => {
  const t = initConvexTest();

  await t.mutation(api.private.recordPayment, {
    pspReference: "psp_123",
    shopperReference: "user_123",
    merchantReference: "ref_123",
    amount: 2500,
    currency: "USD",
    status: "authorised",
    paymentMethod: "visa",
  });

  const payment = await t.query(api.public.getPayment, {
    pspReference: "psp_123",
  });
  expect(payment).not.toBeNull();
  expect(payment!.amount).toBe(2500);
  expect(payment!.status).toBe("authorised");

  // Update status
  await t.mutation(api.private.updatePaymentStatus, {
    pspReference: "psp_123",
    status: "captured",
  });

  const updated = await t.query(api.public.getPayment, {
    pspReference: "psp_123",
  });
  expect(updated!.status).toBe("captured");
});
