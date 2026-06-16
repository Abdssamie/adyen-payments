/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    private: {
      insertCheckoutSession: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          currency: string;
          merchantReference: string;
          sessionData: string;
          sessionId: string;
          shopperReference?: string;
          url?: string;
        },
        null,
        Name
      >;
      recordPayment: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          currency: string;
          merchantReference: string;
          metadata?: any;
          orgId?: string;
          originalReference?: string;
          paymentMethod?: string;
          pspReference: string;
          shopperReference?: string;
          status: string;
          userId?: string;
        },
        null,
        Name
      >;
      syncPaymentMethods: FunctionReference<
        "mutation",
        "internal",
        {
          paymentMethods: Array<{
            cardExpiryMonth?: string;
            cardExpiryYear?: string;
            cardLast4?: string;
            metadata?: any;
            recurringDetailReference: string;
            variant: string;
          }>;
          shopperReference: string;
        },
        null,
        Name
      >;
      updatePaymentStatus: FunctionReference<
        "mutation",
        "internal",
        { originalReference?: string; pspReference: string; status: string },
        null,
        Name
      >;
    };
    public: {
      createOrUpdateShopper: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          shopperReference: string;
          userId?: string;
        },
        string,
        Name
      >;
      getCheckoutSession: FunctionReference<
        "query",
        "internal",
        { sessionId: string },
        {
          amount: number;
          currency: string;
          merchantReference: string;
          sessionData: string;
          sessionId: string;
          shopperReference?: string;
          status: string;
          url?: string;
        } | null,
        Name
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { pspReference: string },
        {
          amount: number;
          created: number;
          currency: string;
          merchantReference: string;
          metadata?: any;
          orgId?: string;
          originalReference?: string;
          paymentMethod?: string;
          pspReference: string;
          shopperReference?: string;
          status: string;
          userId?: string;
        } | null,
        Name
      >;
      getShopper: FunctionReference<
        "query",
        "internal",
        { shopperReference: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          shopperReference: string;
          userId?: string;
        } | null,
        Name
      >;
      getShopperByEmail: FunctionReference<
        "query",
        "internal",
        { email: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          shopperReference: string;
          userId?: string;
        } | null,
        Name
      >;
      getShopperByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          shopperReference: string;
          userId?: string;
        } | null,
        Name
      >;
      listPaymentMethods: FunctionReference<
        "query",
        "internal",
        { shopperReference: string },
        Array<{
          cardExpiryMonth?: string;
          cardExpiryYear?: string;
          cardLast4?: string;
          metadata?: any;
          recurringDetailReference: string;
          shopperReference: string;
          status: string;
          variant: string;
        }>,
        Name
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { shopperReference: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          merchantReference: string;
          metadata?: any;
          orgId?: string;
          originalReference?: string;
          paymentMethod?: string;
          pspReference: string;
          shopperReference?: string;
          status: string;
          userId?: string;
        }>,
        Name
      >;
      listPaymentsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          merchantReference: string;
          metadata?: any;
          orgId?: string;
          originalReference?: string;
          paymentMethod?: string;
          pspReference: string;
          shopperReference?: string;
          status: string;
          userId?: string;
        }>,
        Name
      >;
      listPaymentsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          merchantReference: string;
          metadata?: any;
          orgId?: string;
          originalReference?: string;
          paymentMethod?: string;
          pspReference: string;
          shopperReference?: string;
          status: string;
          userId?: string;
        }>,
        Name
      >;
    };
  };
