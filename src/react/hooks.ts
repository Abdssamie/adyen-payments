"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import type {
  FunctionReference,
} from "convex/server";

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface StoredCard {
  shopperReference: string;
  recurringDetailReference: string;
  variant: string;
  cardLast4?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransaction {
  pspReference: string;
  originalReference?: string;
  shopperReference?: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  created: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Config shape required by all hooks
// ---------------------------------------------------------------------------

/**
 * The Convex API references the hooks need.
 * Pass in the `api` object generated for your example app.
 *
 * Example:
 * ```ts
 * import { api } from "../convex/_generated/api";
 * const config: AdyenHooksConfig = { api };
 * ```
 */
export interface AdyenHooksConfig {
  queries: {
    getShopper: FunctionReference<"query">;
    listPaymentMethods: FunctionReference<"query">;
    listPayments: FunctionReference<"query">;
    getPayment: FunctionReference<"query">;
  };
  actions: {
    getOrCreateShopper: FunctionReference<"action">;
    createCheckout: FunctionReference<"action">;
    syncPaymentMethods: FunctionReference<"action">;
    deletePaymentMethod: FunctionReference<"action">;
    chargeCard: FunctionReference<"action">;
    capture: FunctionReference<"action">;
    refund: FunctionReference<"action">;
    cancel: FunctionReference<"action">;
  };
}

// ---------------------------------------------------------------------------
// useAdyenShopper
// ---------------------------------------------------------------------------

interface UseAdyenShopperOptions {
  shopperReference: string;
  config: AdyenHooksConfig;
}

interface UseAdyenShopperResult {
  shopper: Record<string, unknown> | null | undefined;
  isLoading: boolean;
  error: string | null;
  register: (args: {
    userId: string;
    email?: string;
    name?: string;
  }) => Promise<void>;
}

/**
 * Manages a shopper identity: reads their record from Convex and provides
 * a `register` function to upsert them via the Adyen component.
 */
export function useAdyenShopper({
  shopperReference,
  config,
}: UseAdyenShopperOptions): UseAdyenShopperResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shopper = useQuery(config.queries.getShopper, { shopperReference }) as
    | Record<string, unknown>
    | null
    | undefined;

  const getOrCreateShopperAction = useAction(config.actions.getOrCreateShopper);

  const register = useCallback(
    async (args: { userId: string; email?: string; name?: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        await getOrCreateShopperAction(args);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to register shopper";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getOrCreateShopperAction]
  );

  return { shopper, isLoading, error, register };
}

// ---------------------------------------------------------------------------
// useStoredPaymentMethods
// ---------------------------------------------------------------------------

interface UseStoredPaymentMethodsOptions {
  shopperReference: string;
  config: AdyenHooksConfig;
}

interface UseStoredPaymentMethodsResult {
  paymentMethods: StoredCard[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  sync: () => Promise<void>;
  remove: (recurringDetailReference: string) => Promise<void>;
}

/**
 * Reads stored (tokenised) payment methods for a shopper from Convex,
 * and provides helpers to sync from Adyen or delete a token.
 */
export function useStoredPaymentMethods({
  shopperReference,
  config,
}: UseStoredPaymentMethodsOptions): UseStoredPaymentMethodsResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentMethods = (useQuery(config.queries.listPaymentMethods, {
    shopperReference,
  }) ?? []) as StoredCard[];

  const syncAction = useAction(config.actions.syncPaymentMethods);
  const deleteAction = useAction(config.actions.deletePaymentMethod);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await syncAction({ shopperReference });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sync payment methods";
      setError(message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [syncAction, shopperReference]);

  const remove = useCallback(
    async (recurringDetailReference: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await deleteAction({ shopperReference, recurringDetailReference });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to remove payment method";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [deleteAction, shopperReference]
  );

  return { paymentMethods, isLoading, isSyncing, error, sync, remove };
}

// ---------------------------------------------------------------------------
// usePayments
// ---------------------------------------------------------------------------

interface UsePaymentsOptions {
  shopperReference: string;
  config: AdyenHooksConfig;
}

interface UsePaymentsResult {
  payments: PaymentTransaction[];
}

/**
 * Reactive list of payment transactions for a shopper, automatically kept
 * up to date by Convex's live query subscription.
 */
export function usePayments({
  shopperReference,
  config,
}: UsePaymentsOptions): UsePaymentsResult {
  const payments = (useQuery(config.queries.listPayments, {
    shopperReference,
  }) ?? []) as PaymentTransaction[];

  return { payments };
}

// ---------------------------------------------------------------------------
// usePaymentOperations
// ---------------------------------------------------------------------------

export interface PaymentOperations {
  chargeCard: (args: {
    shopperReference: string;
    recurringDetailReference: string;
    amount: number;
    currency: string;
  }) => Promise<{ pspReference: string | null; status: string; resultCode: string }>;
  capture: (args: {
    pspReference: string;
    amount: number;
    currency: string;
  }) => Promise<void>;
  refund: (args: {
    pspReference: string;
    amount: number;
    currency: string;
  }) => Promise<void>;
  cancel: (args: { pspReference: string }) => Promise<void>;
  createCheckoutSession: (args: {
    amount: number;
    currency: string;
    shopperReference?: string;
  }) => Promise<{ sessionId: string; sessionData: string; url: string | null }>;
  isLoading: (key: string) => boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Provides callable async helpers for all payment lifecycle operations —
 * checkout session creation, MIT charges, captures, refunds, and cancellations.
 * Tracks per-operation loading state via a string key.
 */
export function usePaymentOperations(config: AdyenHooksConfig): PaymentOperations {
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const chargeCardAction = useAction(config.actions.chargeCard);
  const captureAction = useAction(config.actions.capture);
  const refundAction = useAction(config.actions.refund);
  const cancelAction = useAction(config.actions.cancel);
  const createCheckoutAction = useAction(config.actions.createCheckout);

  const withLoading = useCallback(
    async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      setLoadingKeys((prev) => new Set(prev).add(key));
      setError(null);
      try {
        return await fn();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        throw err;
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    []
  );

  const chargeCard = useCallback(
    (args: {
      shopperReference: string;
      recurringDetailReference: string;
      amount: number;
      currency: string;
    }) =>
      withLoading(`charge:${args.recurringDetailReference}`, () =>
        chargeCardAction(args) as Promise<{
          pspReference: string | null;
          status: string;
          resultCode: string;
        }>
      ),
    [chargeCardAction, withLoading]
  );

  const capture = useCallback(
    (args: { pspReference: string; amount: number; currency: string }) =>
      withLoading(`capture:${args.pspReference}`, () =>
        captureAction(args).then(() => undefined)
      ),
    [captureAction, withLoading]
  );

  const refund = useCallback(
    (args: { pspReference: string; amount: number; currency: string }) =>
      withLoading(`refund:${args.pspReference}`, () =>
        refundAction(args).then(() => undefined)
      ),
    [refundAction, withLoading]
  );

  const cancel = useCallback(
    (args: { pspReference: string }) =>
      withLoading(`cancel:${args.pspReference}`, () =>
        cancelAction(args).then(() => undefined)
      ),
    [cancelAction, withLoading]
  );

  const createCheckoutSession = useCallback(
    (args: { amount: number; currency: string; shopperReference?: string }) =>
      withLoading("checkout", () =>
        createCheckoutAction(args) as Promise<{
          sessionId: string;
          sessionData: string;
          url: string | null;
        }>
      ),
    [createCheckoutAction, withLoading]
  );

  const isLoading = useCallback(
    (key: string) => loadingKeys.has(key),
    [loadingKeys]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    chargeCard,
    capture,
    refund,
    cancel,
    createCheckoutSession,
    isLoading,
    error,
    clearError,
  };
}

// ---------------------------------------------------------------------------
// useAdyenDropin
// ---------------------------------------------------------------------------

export interface UseAdyenDropinOptions {
  /** Adyen client key (ADYEN_CLIENT_KEY) — safe to expose on the frontend */
  clientKey: string;
  /** Session ID returned by createCheckoutSession */
  sessionId: string | null;
  /** Session data blob returned by createCheckoutSession */
  sessionData: string | null;
  /** Environment: "TEST" or "LIVE" */
  environment?: "test" | "live";
  /** Callback when Adyen reports payment completion */
  onPaymentCompleted?: (result: { resultCode: string }) => void;
  /** Callback when Adyen reports an error */
  onError?: (error: { name: string; message: string }) => void;
}

export interface UseAdyenDropinResult {
  /** Ref to attach to a container div — Adyen mounts the Drop-in here */
  containerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  mountError: string | null;
}

/**
 * Mounts the Adyen Drop-in UI component into a provided container div.
 * Automatically initialises or re-initialises when sessionId/sessionData changes.
 *
 * Usage:
 * ```tsx
 * const { containerRef } = useAdyenDropin({ clientKey, sessionId, sessionData });
 * return <div ref={containerRef} />;
 * ```
 */
export function useAdyenDropin({
  clientKey,
  sessionId,
  sessionData,
  environment = "test",
  onPaymentCompleted,
  onError,
}: UseAdyenDropinOptions): UseAdyenDropinResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropinRef = useRef<{ unmount?: () => void } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !sessionData || !containerRef.current || !clientKey) {
      return;
    }

    let cancelled = false;

    const mountDropin = async () => {
      try {
        // Dynamically import to avoid SSR issues and keep bundle lean
        const { AdyenCheckout, Dropin } = await import("@adyen/adyen-web");

        if (cancelled || !containerRef.current) return;

        // Unmount previous instance if any
        if (dropinRef.current?.unmount) {
          dropinRef.current.unmount();
        }

        const checkout = await AdyenCheckout({
          environment,
          clientKey,
          session: { id: sessionId, sessionData },
          onPaymentCompleted: (result: { resultCode: string }) => {
            if (!cancelled) onPaymentCompleted?.(result);
          },
          onError: (err: { name: string; message: string }) => {
            if (!cancelled) onError?.(err);
          },
        });

        if (cancelled || !containerRef.current) return;

        // v6 API: instantiate Dropin with the Core instance, then mount
        const dropin = new Dropin(checkout).mount(containerRef.current);
        dropinRef.current = dropin as { unmount?: () => void };
        if (!cancelled) setIsReady(true);
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to mount Adyen Drop-in";
          setMountError(message);
        }
      }
    };

    setIsReady(false);
    setMountError(null);
    void mountDropin();

    return () => {
      cancelled = true;
      if (dropinRef.current?.unmount) {
        dropinRef.current.unmount();
        dropinRef.current = null;
      }
    };
  }, [clientKey, sessionId, sessionData, environment, onPaymentCompleted, onError]);

  return { containerRef, isReady, mountError };
}
