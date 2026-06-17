import { api } from "../convex/_generated/api";
import { useState } from "react";
import {
  useAdyenShopper,
  useStoredPaymentMethods,
  usePayments,
  usePaymentOperations,
  useAdyenDropin,
} from "../../src/react/hooks.js";
import type { AdyenHooksConfig, StoredCard, PaymentTransaction } from "../../src/react/hooks.js";

// ---------------------------------------------------------------------------
// Convex API config for hooks
// ---------------------------------------------------------------------------
const hooksConfig: AdyenHooksConfig = {
  queries: {
    getShopper:          api.queries.getShopper,
    listPaymentMethods:  api.queries.listPaymentMethods,
    listPayments:        api.queries.listPayments,
    getPayment:          api.queries.listPayments, // proxy — unused by hooks directly
  },
  actions: {
    getOrCreateShopper:  api.example.getOrCreateShopper,
    createCheckout:      api.example.createCheckout,
    syncPaymentMethods:  api.example.syncPaymentMethods,
    deletePaymentMethod: api.example.deletePaymentMethod,
    chargeCard:          api.example.chargeCard,
    capture:             api.example.capture,
    refund:              api.example.refund,
    cancel:              api.example.cancel,
  },
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  authorised:    "badge-green",
  captured:      "badge-green",
  refunded:      "badge-blue",
  cancelled:     "badge-red",
  refused:       "badge-red",
  capture_failed:"badge-red",
  refund_failed: "badge-red",
  cancel_failed: "badge-red",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Spinner button */
function Btn({
  onClick, disabled, className = "btn btn-primary", loading, children, style,
}: {
  onClick?: () => void; disabled?: boolean; className?: string;
  loading?: boolean; children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button className={className} onClick={onClick} disabled={disabled || loading} style={style}>
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

/** Shopper setup panel */
function ShopperPanel({
  shopperRef, setShopperRef, email, setEmail, name, setName, config,
}: {
  shopperRef: string; setShopperRef: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  name: string; setName: (v: string) => void;
  config: AdyenHooksConfig;
}) {
  const { shopper, isLoading, register } = useAdyenShopper({
    shopperReference: shopperRef,
    config,
  });

  const handleRegister = () =>
    register({ userId: shopperRef, email, name }).catch(() => undefined);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-icon">👤</span>
          Shopper Identity
        </span>
        {shopper
          ? <span className="badge badge-green pulse-dot">Active</span>
          : <span className="badge badge-amber">Not synced</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="field">
          <label className="field-label">Shopper Reference</label>
          <input className="input" value={shopperRef}
            onChange={(e) => setShopperRef(e.target.value)}
            placeholder="user_abc123" />
          <span className="field-hint">Unique identifier used in all Adyen calls</span>
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="shopper@example.com" />
        </div>
        <div className="field">
          <label className="field-label">Display Name</label>
          <input className="input" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe" />
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <Btn
          className="btn btn-primary btn-full"
          loading={isLoading}
          onClick={handleRegister}
        >
          {shopper ? "Update Shopper" : "Register Shopper"}
        </Btn>
        {shopper && (
          <div className="shopper-status">
            <span className="badge badge-green pulse-dot">Connected</span>
            <strong>ID:</strong>
            <span className="mono">{shopperRef}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Checkout + Drop-in panel */
function CheckoutPanel({
  shopperRef, config,
}: { shopperRef: string; config: AdyenHooksConfig }) {
  const [amount, setAmount]     = useState(5000);
  const [currency, setCurrency] = useState("EUR");
  const [tab, setTab]           = useState<"dropin" | "link">("dropin");
  const [session, setSession]   = useState<{
    sessionId: string; sessionData: string; url: string | null;
  } | null>(null);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);

  const ops = usePaymentOperations(config);

  const handleCreateSession = async () => {
    const result = await ops.createCheckoutSession({ amount, currency, shopperReference: shopperRef });
    setSession(result);
    setPaymentResult(null);
  };

  const clientKey = import.meta.env.VITE_ADYEN_CLIENT_KEY as string | undefined;

  const getCountryCode = (curr: string) => {
    switch (curr) {
      case "USD": return "US";
      case "GBP": return "GB";
      case "EUR":
      default: return "NL";
    }
  };

  const { containerRef, mountError } = useAdyenDropin({
    clientKey: clientKey ?? "",
    sessionId: session?.sessionId ?? null,
    sessionData: session?.sessionData ?? null,
    environment: "test",
    countryCode: getCountryCode(currency),
    onPaymentCompleted: (result: { resultCode: string }) => setPaymentResult(result.resultCode),
    onError: (err: { name: string; message: string }) => setPaymentResult(`Error: ${err.message}`),
  });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-icon">🛒</span>
          Checkout Session
        </span>
        {session && <span className="badge badge-accent">Session active</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="field">
          <label className="field-label">Amount (minor units)</label>
          <input className="input" type="number" value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)} />
          <span className="amount-display">{fmtCurrency(amount, currency)}</span>
        </div>
        <div className="field">
          <label className="field-label">Currency</label>
          <select className="select" value={currency}
            onChange={(e) => setCurrency(e.target.value)}>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      <Btn
        className="btn btn-primary btn-full"
        style={{ marginTop: "1.25rem" }}
        loading={ops.isLoading("checkout")}
        onClick={handleCreateSession}
      >
        {session ? "New Session" : "Create Checkout Session"}
      </Btn>

      {paymentResult && (
        <div className={`success-banner`} style={{ marginTop: "1rem", marginBottom: 0 }}>
          <span>🎉</span>
          <span>Payment result: <strong>{paymentResult}</strong></span>
        </div>
      )}

      {session && (
        <>
          <div className="tabs" style={{ marginTop: "1.25rem", marginBottom: 0 }}>
            <button className={`tab ${tab === "dropin" ? "active" : ""}`}
              onClick={() => setTab("dropin")}>
              Adyen Drop-in
            </button>
            <button className={`tab ${tab === "link" ? "active" : ""}`}
              onClick={() => setTab("link")}>
              Redirect Link
            </button>
          </div>

          {tab === "dropin" ? (
            clientKey ? (
              mountError ? (
                <div className="error-banner" style={{ marginTop: "1rem" }}>
                  ⚠ Drop-in mount error: {mountError}
                </div>
              ) : (
                <div className="adyen-dropin-wrapper">
                  <div ref={containerRef} id="adyen-dropin-container" />
                </div>
              )
            ) : (
              <div className="tips-box" style={{ marginTop: "1rem" }}>
                <strong>VITE_ADYEN_CLIENT_KEY not set.</strong><br />
                Add it to your <code>.env.local</code> to enable the embedded Drop-in component.<br />
                Alternatively, use the "Redirect Link" tab to pay via Adyen's hosted page.
              </div>
            )
          ) : (
            <div style={{ marginTop: "1rem" }}>
              {session.url ? (
                <a
                  href={session.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-success btn-full"
                  style={{ display: "flex" }}
                >
                  Open Adyen Hosted Checkout →
                </a>
              ) : (
                <div className="empty-state">
                  <p>No redirect URL returned for this session.</p>
                </div>
              )}
              <div className="tips-box">
                <strong>Session ID:</strong>
                <br />
                <code className="mono">{session.sessionId}</code>
              </div>
            </div>
          )}
        </>
      )}

      {!session && (
        <div className="dropin-placeholder">
          <div className="dropin-placeholder-icon">💳</div>
          <p>Create a checkout session to embed the Adyen Drop-in payment form or get a hosted redirect link.</p>
        </div>
      )}

      {!clientKey && !session && (
        <div className="tips-box">
          <strong>Test cards:</strong>
          <ul>
            <li>Visa (success): <code>4111 1111 1111 1111</code></li>
            <li>Mastercard: <code>5500 0000 0000 0004</code></li>
            <li>3DS2 trigger: <code>4917 6100 0000 0000</code></li>
            <li>Expiry: any future date — CVV: <code>737</code></li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Stored payment methods section */
function StoredCardsSection({
  shopperRef, config, ops,
}: {
  shopperRef: string;
  config: AdyenHooksConfig;
  ops: ReturnType<typeof usePaymentOperations>;
}) {
  const { paymentMethods, isSyncing, sync, remove } = useStoredPaymentMethods({
    shopperReference: shopperRef,
    config,
  });

  const [chargeAmount, setChargeAmount]     = useState(1500);
  const [chargeCurrency, setChargeCurrency] = useState("EUR");

  const handleCharge = async (ref: string) => {
    const result = await ops.chargeCard({
      shopperReference: shopperRef,
      recurringDetailReference: ref,
      amount: chargeAmount,
      currency: chargeCurrency,
    }).catch(() => null);
    if (result) {
      alert(`Result: ${result.resultCode}\nPSP: ${result.pspReference ?? "—"}`);
    }
  };

  return (
    <>
      <div className="section-divider">
        <h2>💳 Stored Payment Methods</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Tokenised Cards
            {paymentMethods.length > 0 && (
              <span className="badge badge-accent">{paymentMethods.length}</span>
            )}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select className="select" style={{ width: "auto", fontSize: "0.75rem", padding: "0.3rem 2rem 0.3rem 0.5rem" }}
              value={chargeCurrency} onChange={(e) => setChargeCurrency(e.target.value)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
            <input className="input" type="number" style={{ width: "90px", fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
              value={chargeAmount} onChange={(e) => setChargeAmount(parseInt(e.target.value) || 0)}
              placeholder="Minor units" />
            <Btn
              className="btn btn-ghost btn-sm"
              loading={isSyncing}
              onClick={sync}
            >
              ↻ Sync
            </Btn>
          </div>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🪪</div>
            <p>No stored cards found for this shopper. Complete a checkout with card-saving enabled first.</p>
          </div>
        ) : (
          <div className="card-grid">
            {paymentMethods.map((method: StoredCard) => (
              <div className="credit-card" key={method.recurringDetailReference}>
                <div className="credit-card-header">
                  <span className="credit-card-network">{method.variant}</span>
                  <span className={`badge badge-sm ${method.status === "active" ? "badge-green" : "badge-red"}`}>
                    {method.status}
                  </span>
                </div>

                <div className="credit-card-number">
                  •••• •••• •••• {method.cardLast4 ?? "••••"}
                </div>

                <div className="credit-card-meta">
                  <span>
                    {method.cardExpiryMonth && method.cardExpiryYear
                      ? `Expires ${method.cardExpiryMonth}/${method.cardExpiryYear}`
                      : "Expiry unknown"}
                  </span>
                  <span className="badge badge-muted" style={{ fontSize: "0.65rem" }}>Saved</span>
                </div>

                <div className="credit-card-token mono">{method.recurringDetailReference}</div>

                <div className="credit-card-actions">
                  <Btn
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                    loading={ops.isLoading(`charge:${method.recurringDetailReference}`)}
                    onClick={() => handleCharge(method.recurringDetailReference)}
                  >
                    Charge {fmtCurrency(chargeAmount, chargeCurrency)}
                  </Btn>
                  <Btn
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm("Remove this stored card?")) remove(method.recurringDetailReference);
                    }}
                  >
                    ✕
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Transactions table */
function TransactionsSection({
  shopperRef, config, ops,
}: {
  shopperRef: string;
  config: AdyenHooksConfig;
  ops: ReturnType<typeof usePaymentOperations>;
}) {
  const { payments } = usePayments({ shopperReference: shopperRef, config });

  const totalAuthorised = (payments as PaymentTransaction[])
    .filter((p: PaymentTransaction) => p.status === "authorised" || p.status === "captured")
    .reduce((acc: number, p: PaymentTransaction) => acc + p.amount, 0);

  const currency = payments[0]?.currency ?? "EUR";

  return (
    <>
      <div className="section-divider">
        <h2>📜 Transactions</h2>
      </div>

      <div className="stats-row">
        <div className="stat-chip">
          <div className="stat-chip-label">Total</div>
          <div className="stat-chip-value">{payments.length}</div>
          <div className="stat-chip-sub">transactions</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-label">Authorised</div>
          <div className="stat-chip-value">{(payments as PaymentTransaction[]).filter((p: PaymentTransaction) => p.status === "authorised").length}</div>
          <div className="stat-chip-sub">awaiting capture</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-label">Captured</div>
          <div className="stat-chip-value">{(payments as PaymentTransaction[]).filter((p: PaymentTransaction) => p.status === "captured").length}</div>
          <div className="stat-chip-sub">settled</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-label">Volume</div>
          <div className="stat-chip-value" style={{ fontSize: "1.1rem" }}>
            {fmtCurrency(totalAuthorised, currency)}
          </div>
          <div className="stat-chip-sub">auth + captured</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {payments.length === 0 ? (
          <div className="empty-state" style={{ margin: "1.5rem" }}>
            <div className="empty-state-icon">🧾</div>
            <p>No transactions yet. Create a checkout session or charge a stored card.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: "none" }}>
            <table>
              <thead>
                <tr>
                  <th>PSP Reference</th>
                  <th>Merchant Ref</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((tx: PaymentTransaction) => {
                  const isAuthorised = tx.status === "authorised";
                  const isCaptured   = tx.status === "captured";
                  const badgeClass   = STATUS_BADGE[tx.status] ?? "badge-muted";

                  return (
                    <tr key={tx.pspReference}>
                      <td>
                        <span className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          {tx.pspReference.slice(0, 16)}…
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{tx.merchantReference}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(tx.amount, tx.currency)}</td>
                      <td>
                        <span className="badge badge-muted" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
                          {tx.paymentMethod ?? "scheme"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{tx.status}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {fmtDate(tx.created)}
                      </td>
                      <td>
                        <div className="tx-actions">
                          {isAuthorised && (
                            <>
                              <Btn
                                className="btn btn-success btn-sm"
                                loading={ops.isLoading(`capture:${tx.pspReference}`)}
                                onClick={() => ops.capture({ pspReference: tx.pspReference, amount: tx.amount, currency: tx.currency })}
                              >
                                Capture
                              </Btn>
                              <Btn
                                className="btn btn-danger btn-sm"
                                loading={ops.isLoading(`cancel:${tx.pspReference}`)}
                                onClick={() => ops.cancel({ pspReference: tx.pspReference })}
                              >
                                Cancel
                              </Btn>
                            </>
                          )}
                          {isCaptured && (
                            <Btn
                              className="btn btn-ghost btn-sm"
                              loading={ops.isLoading(`refund:${tx.pspReference}`)}
                              onClick={() => ops.refund({ pspReference: tx.pspReference, amount: tx.amount, currency: tx.currency })}
                            >
                              Refund
                            </Btn>
                          )}
                          {!isAuthorised && !isCaptured && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
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
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  const [shopperRef, setShopperRef] = useState("test_shopper_1");
  const [email, setEmail]           = useState("test@example.com");
  const [name, setName]             = useState("Test Shopper");

  const ops = usePaymentOperations(hooksConfig);

  return (
    <div className="app-shell">
      <div className="app-container">

        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="navbar-logo">💸</div>
            <div>
              <div className="navbar-title">Adyen Payments</div>
              <div className="navbar-subtitle">Convex Component · TEST Mode</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span className="badge badge-accent">TEST env</span>
            <span className="badge badge-green pulse-dot">Convex live</span>
          </div>
        </nav>

        {/* ── Global error ── */}
        {ops.error && (
          <div className="error-banner">
            <span>⚠</span>
            <span><strong>Error:</strong> {ops.error}</span>
            <button onClick={ops.clearError}>✕</button>
          </div>
        )}

        {/* ── Top panels ── */}
        <div className="grid-2">
          <ShopperPanel
            shopperRef={shopperRef} setShopperRef={setShopperRef}
            email={email} setEmail={setEmail}
            name={name} setName={setName}
            config={hooksConfig}
          />
          <CheckoutPanel shopperRef={shopperRef} config={hooksConfig} />
        </div>

        {/* ── Stored cards ── */}
        <StoredCardsSection shopperRef={shopperRef} config={hooksConfig} ops={ops} />

        {/* ── Transactions ── */}
        <TransactionsSection shopperRef={shopperRef} config={hooksConfig} ops={ops} />

      </div>
    </div>
  );
}
