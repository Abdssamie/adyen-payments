import { useAction, useQuery } from "convex/react";
import { api, components } from "../convex/_generated/api";
import { useState } from "react";

interface SessionResult {
  sessionId: string;
  sessionData: string;
  url: string | null;
  merchantReference: string;
}

interface StoredCard {
  shopperReference: string;
  recurringDetailReference: string;
  variant: string;
  cardLast4?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  status: string;
  metadata?: any;
}

interface PaymentTransaction {
  pspReference: string;
  originalReference?: string;
  shopperReference?: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  created: number;
  userId?: string;
  orgId?: string;
  metadata?: any;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [shopperReference, setShopperReference] = useState<string>("guest_shopper_1");
  const [shopperEmail, setShopperEmail] = useState<string>("guest@example.com");
  const [shopperName, setShopperName] = useState<string>("Guest Shopper");

  const [checkoutAmount, setCheckoutAmount] = useState<number>(5000); // $50.00
  const [checkoutCurrency, setCheckoutCurrency] = useState<string>("USD");

  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Actions
  const getOrCreateShopperAction = useAction(api.example.getOrCreateShopper);
  const createCheckoutAction = useAction(api.example.createCheckout);
  const listStoredPaymentMethodsAction = useAction(api.example.syncPaymentMethods);
  const deleteStoredPaymentMethodAction = useAction(api.example.deletePaymentMethod);
  const chargeCardAction = useAction(api.example.chargeCard);
  const capturePaymentAction = useAction(api.example.capture);
  const refundPaymentAction = useAction(api.example.refund);
  const cancelPaymentAction = useAction(api.example.cancel);

  // Queries
  const shopper = useQuery(api.queries.getShopper, { shopperReference });
  const paymentMethods = (useQuery(api.queries.listPaymentMethods, { shopperReference }) || []) as StoredCard[];
  const payments = (useQuery(api.queries.listPayments, { shopperReference }) || []) as PaymentTransaction[];

  const handleRegisterShopper = async () => {
    setLoading("shopper");
    setErrorMsg(null);
    try {
      await getOrCreateShopperAction({
        userId: shopperReference,
        email: shopperEmail,
        name: shopperName,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to create shopper");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateCheckout = async () => {
    setLoading("checkout");
    setErrorMsg(null);
    try {
      const result = await createCheckoutAction({
        amount: checkoutAmount,
        currency: checkoutCurrency,
        shopperReference,
      });
      setSessionResult(result as SessionResult);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to create checkout session");
    } finally {
      setLoading(null);
    }
  };

  const handleSyncPaymentMethods = async () => {
    setLoading("sync-cards");
    setErrorMsg(null);
    try {
      await listStoredPaymentMethodsAction({ shopperReference });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to sync payment methods");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteCard = async (recurringDetailReference: string) => {
    if (!confirm("Are you sure you want to delete this tokenized card?")) return;
    setLoading(`delete-${recurringDetailReference}`);
    setErrorMsg(null);
    try {
      await deleteStoredPaymentMethodAction({
        shopperReference,
        recurringDetailReference,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to delete payment method");
    } finally {
      setLoading(null);
    }
  };

  const handleChargeCard = async (recurringDetailReference: string) => {
    setLoading(`charge-${recurringDetailReference}`);
    setErrorMsg(null);
    try {
      const response = await chargeCardAction({
        shopperReference,
        recurringDetailReference,
        amount: 1500, // charge $15.00
        currency: "USD",
      });
      alert(`Charge Result: ${response.resultCode} (PSP: ${response.pspReference})`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to charge card");
    } finally {
      setLoading(null);
    }
  };

  const handleCapture = async (pspReference: string, amount: number, currency: string) => {
    setLoading(`capture-${pspReference}`);
    setErrorMsg(null);
    try {
      await capturePaymentAction({ pspReference, amount, currency });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to capture payment");
    } finally {
      setLoading(null);
    }
  };

  const handleRefund = async (pspReference: string, amount: number, currency: string) => {
    setLoading(`refund-${pspReference}`);
    setErrorMsg(null);
    try {
      await refundPaymentAction({ pspReference, amount, currency });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to refund payment");
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (pspReference: string) => {
    setLoading(`cancel-${pspReference}`);
    setErrorMsg(null);
    try {
      await cancelPaymentAction({ pspReference });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to cancel payment");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0F0F11",
      color: "#E2E2E9",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "2rem 1.5rem"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #27272A",
          paddingBottom: "1.5rem",
          marginBottom: "2rem"
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "#FFFFFF" }}>
              Adyen Payments Component
            </h1>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#A1A1AA" }}>
              Convex Sandbox & Operation Dashboard
            </p>
          </div>
          <div style={{
            backgroundColor: "#1C1C1E",
            border: "1px solid #2C2C2E",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "#0ABF53"
          }}>
            ● Connected to Convex
          </div>
        </header>

        {/* Error alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#EF4444",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            fontSize: "0.9rem"
          }}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {/* Dashboard Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>

          {/* Shopper Card */}
          <div style={{
            backgroundColor: "#18181B",
            border: "1px solid #27272A",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "#FFFFFF", fontSize: "1.1rem" }}>👤 Shopper Session</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flexGrow: 1 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#A1A1AA", marginBottom: "0.25rem" }}>Shopper Reference / ID</label>
                <input
                  type="text"
                  value={shopperReference}
                  onChange={(e) => setShopperReference(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.9rem"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#A1A1AA", marginBottom: "0.25rem" }}>Email</label>
                <input
                  type="email"
                  value={shopperEmail}
                  onChange={(e) => setShopperEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.9rem"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#A1A1AA", marginBottom: "0.25rem" }}>Full Name</label>
                <input
                  type="text"
                  value={shopperName}
                  onChange={(e) => setShopperName(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.9rem"
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button
                onClick={handleRegisterShopper}
                disabled={loading === "shopper"}
                style={{
                  width: "100%",
                  backgroundColor: loading === "shopper" ? "#27272A" : "#0ABF53",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: loading === "shopper" ? "not-allowed" : "pointer"
                }}
              >
                {loading === "shopper" ? "Registering..." : "Sync / Register Shopper"}
              </button>
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#A1A1AA" }}>
                Status: {shopper ? (
                  <span style={{ color: "#0ABF53" }}>Registered (ID: {shopper.shopperReference})</span>
                ) : (
                  <span style={{ color: "#F59E0B" }}>Not synced in DB</span>
                )}
              </div>
            </div>
          </div>

          {/* Checkout Card */}
          <div style={{
            backgroundColor: "#18181B",
            border: "1px solid #27272A",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "#FFFFFF", fontSize: "1.1rem" }}>🛍️ Initialize Checkout</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flexGrow: 1 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#A1A1AA", marginBottom: "0.25rem" }}>Amount (in Cents/Minor units)</label>
                <input
                  type="number"
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(parseInt(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.9rem"
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#A1A1AA", marginTop: "0.25rem", display: "inline-block" }}>
                  = {formatCurrency(checkoutAmount, checkoutCurrency)}
                </span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#A1A1AA", marginBottom: "0.25rem" }}>Currency</label>
                <select
                  value={checkoutCurrency}
                  onChange={(e) => setCheckoutCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button
                onClick={handleCreateCheckout}
                disabled={loading === "checkout"}
                style={{
                  width: "100%",
                  backgroundColor: loading === "checkout" ? "#27272A" : "#0ABF53",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: loading === "checkout" ? "not-allowed" : "pointer"
                }}
              >
                {loading === "checkout" ? "Creating..." : "Create Checkout Session"}
              </button>
              
              {sessionResult && (
                <div style={{
                  marginTop: "1rem",
                  backgroundColor: "#0F0F11",
                  border: "1px solid #27272A",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  fontSize: "0.8rem"
                }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "#FFFFFF" }}>Session Created!</div>
                  <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#A1A1AA" }}>
                    ID: {sessionResult.sessionId}
                  </div>
                  {sessionResult.url && (
                    <a
                      href={sessionResult.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        marginTop: "0.5rem",
                        color: "#0ABF53",
                        textDecoration: "underline",
                        fontWeight: 600
                      }}
                    >
                      Open Checkout Redirect Page →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stored Cards */}
        <section style={{
          backgroundColor: "#18181B",
          border: "1px solid #27272A",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <h3 style={{ margin: 0, color: "#FFFFFF", fontSize: "1.1rem" }}>💳 Stored Payment Instruments</h3>
            <button
              onClick={handleSyncPaymentMethods}
              disabled={loading === "sync-cards"}
              style={{
                backgroundColor: "#27272A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "0.4rem 0.8rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: loading === "sync-cards" ? "not-allowed" : "pointer"
              }}
            >
              {loading === "sync-cards" ? "Syncing..." : "Sync Cards from Adyen"}
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "2rem",
              color: "#A1A1AA",
              border: "1px dashed #27272A",
              borderRadius: "8px"
            }}>
              No stored payment methods found for this shopper reference. Run checkout with card-saving consent first.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem"
            }}>
              {paymentMethods.map((method) => (
                <div
                  key={method.recurringDetailReference}
                  style={{
                    backgroundColor: "#0F0F11",
                    border: "1px solid #27272A",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        backgroundColor: "#1C1C1E",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        textTransform: "uppercase"
                      }}>
                        {method.variant}
                      </span>
                      <span style={{
                        fontSize: "0.75rem",
                        color: method.status === "active" ? "#0ABF53" : "#EF4444"
                      }}>
                        ● {method.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, margin: "1rem 0 0.5rem 0", color: "#FFFFFF" }}>
                      •••• •••• •••• {method.cardLast4 || "••••"}
                    </div>
                    {method.cardExpiryMonth && method.cardExpiryYear && (
                      <div style={{ fontSize: "0.8rem", color: "#A1A1AA" }}>
                        Expires: {method.cardExpiryMonth}/{method.cardExpiryYear}
                      </div>
                    )}
                    <div style={{ fontSize: "0.7rem", color: "#A1A1AA", marginTop: "0.5rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      Token: {method.recurringDetailReference}
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "1.25rem",
                    borderTop: "1px solid #27272A",
                    paddingTop: "0.75rem"
                  }}>
                    <button
                      onClick={() => handleChargeCard(method.recurringDetailReference)}
                      disabled={loading === `charge-${method.recurringDetailReference}`}
                      style={{
                        flex: 1,
                        backgroundColor: "#0ABF53",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "4px",
                        padding: "0.4rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: loading === `charge-${method.recurringDetailReference}` ? "not-allowed" : "pointer"
                      }}
                    >
                      {loading === `charge-${method.recurringDetailReference}` ? "Charging..." : "Charge $15.00"}
                    </button>
                    <button
                      onClick={() => handleDeleteCard(method.recurringDetailReference)}
                      disabled={loading === `delete-${method.recurringDetailReference}`}
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "#EF4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "4px",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: loading === `delete-${method.recurringDetailReference}` ? "not-allowed" : "pointer"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payments Table */}
        <section style={{
          backgroundColor: "#18181B",
          border: "1px solid #27272A",
          borderRadius: "12px",
          padding: "1.5rem"
        }}>
          <h3 style={{ margin: "0 0 1.25rem 0", color: "#FFFFFF", fontSize: "1.1rem" }}>📜 Transaction Operations Log</h3>

          {payments.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "2rem",
              color: "#A1A1AA",
              border: "1px dashed #27272A",
              borderRadius: "8px"
            }}>
              No transactions recorded for this shopper. Use Checkout or Charge Card to make payments.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.9rem"
              }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #27272A", color: "#A1A1AA" }}>
                    <th style={{ padding: "0.75rem 0.5rem" }}>PSP Reference</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Merchant Ref</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Amount</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Method</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>Date</th>
                    <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const isAuthorised = payment.status === "authorised";
                    const isCaptured = payment.status === "captured";

                    let statusBg = "#27272A";
                    let statusColor = "#A1A1AA";
                    if (payment.status === "authorised") { statusBg = "rgba(16, 185, 129, 0.15)"; statusColor = "#10B981"; }
                    if (payment.status === "captured") { statusBg = "rgba(10, 191, 83, 0.15)"; statusColor = "#0ABF53"; }
                    if (payment.status === "refunded") { statusBg = "rgba(59, 130, 246, 0.15)"; statusColor = "#3B82F6"; }
                    if (payment.status === "cancelled") { statusBg = "rgba(239, 68, 68, 0.15)"; statusColor = "#EF4444"; }
                    if (payment.status === "refused") { statusBg = "rgba(220, 38, 38, 0.15)"; statusColor = "#DC2626"; }

                    return (
                      <tr key={payment.pspReference} style={{ borderBottom: "1px solid #27272A" }}>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, color: "#FFFFFF" }}>{payment.pspReference}</td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "#A1A1AA" }}>{payment.merchantReference}</td>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{formatCurrency(payment.amount, payment.currency)}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textTransform: "uppercase", fontSize: "0.8rem" }}>{payment.paymentMethod || "scheme"}</td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <span style={{
                            backgroundColor: statusBg,
                            color: statusColor,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "inline-block"
                          }}>
                            {payment.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "#A1A1AA" }}>{formatDate(payment.created)}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            {isAuthorised && (
                              <>
                                <button
                                  onClick={() => handleCapture(payment.pspReference, payment.amount, payment.currency)}
                                  disabled={loading === `capture-${payment.pspReference}`}
                                  style={{
                                    backgroundColor: "#0ABF53",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "0.3rem 0.6rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: loading === `capture-${payment.pspReference}` ? "not-allowed" : "pointer"
                                  }}
                                >
                                  Capture
                                </button>
                                <button
                                  onClick={() => handleCancel(payment.pspReference)}
                                  disabled={loading === `cancel-${payment.pspReference}`}
                                  style={{
                                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                                    color: "#EF4444",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    borderRadius: "4px",
                                    padding: "0.3rem 0.6rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: loading === `cancel-${payment.pspReference}` ? "not-allowed" : "pointer"
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {isCaptured && (
                              <button
                                onClick={() => handleRefund(payment.pspReference, payment.amount, payment.currency)}
                                disabled={loading === `refund-${payment.pspReference}`}
                                style={{
                                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                                  color: "#3B82F6",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  borderRadius: "4px",
                                  padding: "0.3rem 0.6rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: loading === `refund-${payment.pspReference}` ? "not-allowed" : "pointer"
                                }}
                              >
                                Refund
                              </button>
                            )}
                            {!isAuthorised && !isCaptured && (
                              <span style={{ fontSize: "0.8rem", color: "#71717A" }}>No operations available</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
