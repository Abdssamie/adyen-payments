import { api } from "../convex/_generated/api";
import { useState } from "react";
import {
  useAdyenShopper,
  useStoredPaymentMethods,
  usePayments,
  usePaymentOperations,
  useAdyenDropin,
} from "../../src/react/hooks.js";
import type {
  AdyenHooksConfig,
  StoredCard,
  PaymentTransaction,
} from "../../src/react/hooks.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const hooksConfig: AdyenHooksConfig = {
  queries: {
    getShopper:         api.queries.getShopper,
    listPaymentMethods: api.queries.listPaymentMethods,
    listPayments:       api.queries.listPayments,
    getPayment:         api.queries.listPayments,
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
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount / 100
  );
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  authorised:     "badge-amber",
  captured:       "badge-green",
  refunded:       "badge-blue",
  cancelled:      "badge-muted",
  refused:        "badge-red",
  capture_failed: "badge-red",
  refund_failed:  "badge-red",
  cancel_failed:  "badge-red",
};

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function Btn({
  onClick,
  disabled,
  className = "btn btn-primary",
  loading,
  children,
  style,
  id,
}: {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
}) {
  return (
    <button
      id={id}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Landing — Navbar
// ---------------------------------------------------------------------------
function LandingNav({ onEnter }: { onEnter: () => void }) {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-brand">
        <div className="brand-logo">⚡</div>
        <span className="brand-name">Adyen Convex</span>
      </div>

      <ul className="landing-nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#demo">Demo</a></li>
        <li>
          <a
            href="https://github.com/get-convex/adyen-payments"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </li>
      </ul>

      <div className="landing-nav-actions">
        <button className="btn btn-primary" id="launch-dashboard-btn" onClick={onEnter}>
          Launch Dashboard →
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Landing — Hero
// ---------------------------------------------------------------------------
function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="hero">
      <h1>
        Payments that feel
        <br />
        <span className="gradient-text">instant & reliable</span>
      </h1>

      <p className="hero-sub">
        A fully functional payment component built on top of Adyen and Convex.
        Drop-in checkout, stored cards, real-time transaction management —
        all in one reactive SDK.
      </p>

      <div className="hero-cta">
        <button className="btn btn-primary btn-xl" id="hero-cta-btn" onClick={onEnter}>
          🚀 Open Demo Dashboard
        </button>
        <a
          href="https://github.com/get-convex/adyen-payments"
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-xl"
          id="hero-github-btn"
        >
          View on GitHub
        </a>
      </div>

      <div className="hero-stats">
        {[
          { value: "99.9%", label: "Uptime SLA" },
          { value: "<50ms", label: "Avg latency" },
          { value: "135+", label: "Currencies" },
          { value: "Real-time", label: "Webhooks" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div className="hero-stat-value">{s.value}</div>
            <div className="hero-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Landing — Features
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    icon: "💳",
    title: "Adyen Drop-in",
    desc: "Embed the full Adyen Drop-in UI component with a single React hook. Handles card input, 3DS2, wallets, and more.",
  },
  {
    icon: "🔄",
    title: "Real-time Sync",
    desc: "All payment state lives in Convex — reactive queries push updates instantly to every connected client.",
  },
  {
    icon: "🪪",
    title: "Stored Cards",
    desc: "Tokenize and store customer payment methods securely via Adyen's recurring payment infrastructure.",
  },
  {
    icon: "🔁",
    title: "Lifecycle Actions",
    desc: "Capture, refund, and cancel payments with a single function call. Full audit trail in your Convex database.",
  },
  {
    icon: "📡",
    title: "Webhook Handler",
    desc: "Built-in Convex HTTP action to receive and verify Adyen webhook events with HMAC signature validation.",
  },
  {
    icon: "🛡️",
    title: "Type-safe SDK",
    desc: "Full TypeScript support with inferred types from your Convex schema. Zero runtime surprises.",
  },
];

function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="section-header">
        <div className="section-eyebrow">What's inside</div>
        <h2 className="section-title">Everything you need for payments</h2>
      </div>

      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Landing — Pricing
// ---------------------------------------------------------------------------
const PLANS = [
  {
    tier: "Starter",
    price: "0",
    period: "/ month",
    desc: "Perfect for testing and side projects. All core APIs included.",
    featured: false,
    cta: "Get started free",
    features: [
      { text: "Adyen Drop-in integration",   ok: true },
      { text: "Up to 100 transactions/mo",   ok: true },
      { text: "Stored payment methods",       ok: true },
      { text: "Webhook handler",              ok: true },
      { text: "Capture / Refund / Cancel",    ok: false },
      { text: "Priority support",             ok: false },
      { text: "Custom branding",              ok: false },
    ],
  },
  {
    tier: "Pro",
    price: "49",
    period: "/ month",
    desc: "For growing products that need full payment lifecycle management.",
    featured: true,
    cta: "Start 14-day trial",
    features: [
      { text: "Everything in Starter",        ok: true },
      { text: "Unlimited transactions",       ok: true },
      { text: "Capture / Refund / Cancel",    ok: true },
      { text: "Real-time analytics",          ok: true },
      { text: "Multi-shopper management",     ok: true },
      { text: "Priority support",             ok: true },
      { text: "Custom branding",              ok: false },
    ],
  },
  {
    tier: "Enterprise",
    price: "199",
    period: "/ month",
    desc: "White-glove setup, SLA guarantees, and full white-label support.",
    featured: false,
    cta: "Contact sales",
    features: [
      { text: "Everything in Pro",            ok: true },
      { text: "Custom branding",              ok: true },
      { text: "Dedicated infrastructure",     ok: true },
      { text: "99.99% uptime SLA",            ok: true },
      { text: "SOC 2 compliance docs",        ok: true },
      { text: "Custom payment methods",       ok: true },
      { text: "White-label SDK",              ok: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
type ModalPlan = "starter" | "pro" | "enterprise" | null;

/** Step 2 — renders the Adyen Drop-in inside the modal once a session exists */
function DropinStep({
  sessionId,
  sessionData,
  currency,
  onDone,
  onError,
}: {
  sessionId: string;
  sessionData: string;
  currency: string;
  onDone: (resultCode: string) => void;
  onError: (msg: string) => void;
}) {
  const clientKey = import.meta.env.VITE_ADYEN_CLIENT_KEY as string | undefined;
  const { containerRef, mountError } = useAdyenDropin({
    clientKey: clientKey ?? "",
    sessionId,
    sessionData,
    environment: "test",
    countryCode: currency === "USD" ? "US" : currency === "GBP" ? "GB" : "NL",
    onPaymentCompleted: (result: { resultCode: string }) => onDone(result.resultCode),
    onError: (err: { name: string; message: string }) => onError(err.message),
  });

  if (!clientKey) {
    return (
      <div className="tips-box" style={{ marginTop: 0 }}>
        <strong>VITE_ADYEN_CLIENT_KEY not set.</strong><br />
        Add it to your <code>.env.local</code> to enable the embedded payment form.
      </div>
    );
  }

  if (mountError) {
    return (
      <div className="error-banner">
        <span>⚠</span>
        <span>Drop-in error: {mountError}</span>
      </div>
    );
  }

  return (
    <div className="adyen-dropin-wrapper" style={{ marginTop: 0 }}>
      <div ref={containerRef} id="modal-adyen-dropin-container" />
    </div>
  );
}

function CheckoutModal({
  plan,
  onClose,
  config,
}: {
  plan: "starter" | "pro";
  onClose: () => void;
  config: AdyenHooksConfig;
}) {
  const [step, setStep]   = useState<"details" | "payment" | "success" | "error">("details");
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ sessionId: string; sessionData: string } | null>(null);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const ops = usePaymentOperations(config);

  const planMeta = {
    starter: { label: "Starter", amount: 0,    currency: "EUR", desc: "Free — no card required" },
    pro:     { label: "Pro",     amount: 4900, currency: "EUR", desc: "$49 / month — 14-day trial" },
  };
  const meta = planMeta[plan];

  const handleProceed = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError(null);
    setLoading(true);
    try {
      const shopperRef = `pricing_${email.replace(/[^a-z0-9]/gi, "_")}`;
      const result = await ops.createCheckoutSession({
        amount: meta.amount,
        currency: meta.currency,
        shopperReference: shopperRef,
      });
      if (result?.sessionId && result?.sessionData) {
        setSession({ sessionId: result.sessionId, sessionData: result.sessionData });
        setStep("payment");
      } else {
        setError("Could not create a checkout session. Check your Adyen configuration.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDone = (code: string) => {
    setResultCode(code);
    setStep(code === "Authorised" || code === "Received" ? "success" : "error");
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
    setStep("error");
  };

  // Wider modal when showing drop-in
  const modalStyle = step === "payment"
    ? { maxWidth: "520px" } as React.CSSProperties
    : undefined;

  return (
    <div className="modal-backdrop" onClick={step === "details" ? onClose : undefined}>
      <div className="modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-plan-badge">{meta.label} Plan</div>
            <div className="modal-title">
              {step === "details" && "Start your journey"}
              {step === "payment" && "Complete payment"}
              {step === "success" && "Payment received!"}
              {step === "error"   && "Payment issue"}
            </div>
            {step === "details" && (
              <div className="modal-subtitle">{meta.desc}</div>
            )}
          </div>
          <button className="modal-close" id="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* ── Step 1: details ── */}
          {step === "details" && (
            <>
              {error && (
                <div className="error-banner" style={{ marginBottom: "1.25rem" }}>
                  <span>⚠</span><span>{error}</span>
                </div>
              )}
              <div className="field">
                <label className="field-label">Your Name</label>
                <input
                  id="modal-name-input"
                  className="input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Email Address</label>
                <input
                  id="modal-email-input"
                  className="input"
                  type="email"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleProceed()}
                />
              </div>
              <div className="modal-redirect-note">
                <span>🔒</span>
                Your payment is processed securely by Adyen. Card details never touch our servers.
              </div>
              <Btn
                id="modal-proceed-btn"
                className="btn btn-primary btn-full"
                style={{ marginTop: "1.25rem" }}
                loading={loading}
                onClick={handleProceed}
              >
                {plan === "starter" ? "Activate Free Plan →" : "Continue to Payment →"}
              </Btn>
            </>
          )}

          {/* ── Step 2: Drop-in ── */}
          {step === "payment" && session && (
            <DropinStep
              sessionId={session.sessionId}
              sessionData={session.sessionData}
              currency={meta.currency}
              onDone={handlePaymentDone}
              onError={handlePaymentError}
            />
          )}

          {/* ── Step 3a: success ── */}
          {step === "success" && (
            <div className="modal-success">
              <div className="modal-success-icon">✓</div>
              <div className="modal-success-title">You're all set!</div>
              <div className="modal-success-desc">
                Payment {resultCode?.toLowerCase()}. Welcome to the <strong>{meta.label}</strong> plan, {name || email}!
              </div>
              <button className="btn btn-primary btn-full" style={{ marginTop: "1.5rem" }} onClick={onClose}>
                Go to dashboard →
              </button>
            </div>
          )}

          {/* ── Step 3b: payment error ── */}
          {step === "error" && (
            <div className="modal-success" style={{ paddingBottom: "0.5rem" }}>
              <div className="modal-success-icon" style={{ background: "var(--red-light)", borderColor: "var(--red-border)", color: "var(--red)" }}>✕</div>
              <div className="modal-success-title" style={{ color: "var(--red)" }}>Payment {resultCode ?? "failed"}</div>
              <div className="modal-success-desc">{error ?? "The payment could not be processed. Please try a different card."}</div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={() => { setStep("details"); setError(null); setSession(null); }}>Try again</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);

  const handleSend = () => {
    if (!name.trim() || !email.trim()) return;
    setSent(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-plan-badge">Enterprise</div>
            <div className="modal-title">Talk to sales</div>
            <div className="modal-subtitle">We'll get back to you within 24 hours</div>
          </div>
          <button className="modal-close" id="contact-modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div className="modal-success">
              <div className="modal-success-icon">✓</div>
              <div className="modal-success-title">Message sent!</div>
              <div className="modal-success-desc">We'll be in touch at <strong>{email}</strong> shortly.</div>
              <button className="btn btn-ghost btn-full" style={{ marginTop: "1.5rem" }} onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <div className="field">
                <label className="field-label">Full Name</label>
                <input id="contact-name" className="input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Work Email</label>
                <input id="contact-email" className="input" type="email" placeholder="jane@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">How can we help?</label>
                <textarea
                  id="contact-message"
                  className="input"
                  style={{ minHeight: "100px", resize: "vertical" }}
                  placeholder="Tell us about your use case, transaction volume, integration needs…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button
                id="contact-send-btn"
                className="btn btn-primary btn-full"
                style={{ marginTop: "1.25rem" }}
                disabled={!name.trim() || !email.trim()}
                onClick={handleSend}
              >
                Send message →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing Section
// ---------------------------------------------------------------------------
function PricingSection({ config }: { config: AdyenHooksConfig }) {
  const [openModal, setOpenModal] = useState<ModalPlan>(null);

  const handleCta = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === "starter" || t === "pro") setOpenModal(t as "starter" | "pro");
    else setOpenModal("enterprise");
  };

  return (
    <>
      {openModal === "starter" && (
        <CheckoutModal plan="starter" onClose={() => setOpenModal(null)} config={config} />
      )}
      {openModal === "pro" && (
        <CheckoutModal plan="pro" onClose={() => setOpenModal(null)} config={config} />
      )}
      {openModal === "enterprise" && (
        <ContactModal onClose={() => setOpenModal(null)} />
      )}

      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <div className="section-eyebrow">Simple pricing</div>
          <h2 className="section-title">Pay for what you use</h2>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`pricing-card${plan.featured ? " featured" : ""}`}
            >
              {plan.featured && <div className="pricing-card-shine" />}
              {plan.featured && (
                <div className="pricing-popular">✦ Most popular</div>
              )}

              <div className="pricing-tier">{plan.tier}</div>

              <div className="pricing-price">
                <span className="pricing-currency">$</span>
                <span className="pricing-amount">{plan.price}</span>
              </div>
              <div className="pricing-period">{plan.period}</div>

              <div className="pricing-desc">{plan.desc}</div>

              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li className="pricing-feature" key={f.text}>
                    {f.ok ? (
                      <span className="pricing-check">✓</span>
                    ) : (
                      <span className="pricing-x">✕</span>
                    )}
                    <span style={{ color: f.ok ? "var(--text-secondary)" : "var(--text-muted)" }}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`btn btn-full${plan.featured ? " btn-primary" : " btn-outline"}`}
                id={`pricing-cta-${plan.tier.toLowerCase()}`}
                onClick={() => handleCta(plan.tier)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Sidebar
// ---------------------------------------------------------------------------
type Page = "overview" | "checkout" | "cards" | "shopper" | "transactions";

const NAV_ITEMS: Array<{
  id: Page;
  icon: string;
  label: string;
  group?: string;
}> = [
  { id: "overview",     icon: "◈",  label: "Overview",     group: "Main" },
  { id: "transactions", icon: "≡",  label: "Transactions",  group: "Main" },
  { id: "cards",        icon: "▤",  label: "Saved Cards",   group: "Payments" },
  { id: "checkout",     icon: "⊕",  label: "Checkout",      group: "Payments" },
  { id: "shopper",      icon: "◉",  label: "Shopper",       group: "Settings" },
];

function Sidebar({
  page,
  setPage,
  onBack,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onBack: () => void;
}) {
  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo" style={{ fontSize: "1rem" }}>⚡</div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">Adyen Convex</div>
          <div className="sidebar-brand-sub">Payment Component Demo</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group}>
            <div className="sidebar-group-label">{group}</div>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item${page === item.id ? " active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <div className="sidebar-group-label">Other</div>
          <button className="nav-item" id="nav-back-to-landing" onClick={onBack}>
            <span className="nav-icon">←</span>
            Back to Landing
          </button>
          <a
            href="https://github.com/get-convex/adyen-payments"
            target="_blank"
            rel="noreferrer"
            className="nav-item"
            id="nav-github"
            style={{ display: "flex" }}
          >
            <span className="nav-icon">⎇</span>
            GitHub Docs
          </a>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">A</div>
          <div>
            <div className="user-name">Admin User</div>
            <div className="user-role" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Administrator
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Topbar
// ---------------------------------------------------------------------------
const PAGE_META: Record<Page, { title: string; subtitle: string }> = {
  overview:     { title: "Overview",        subtitle: "Payment activity at a glance" },
  transactions: { title: "Transactions",    subtitle: "Full payment history & lifecycle actions" },
  cards:        { title: "Saved Cards",     subtitle: "Tokenised payment methods for this shopper" },
  checkout:     { title: "Checkout",        subtitle: "Create a session & embed Adyen Drop-in" },
  shopper:      { title: "Shopper Profile", subtitle: "Identity & registration settings" },
};

function Topbar({
  page,
  ops,
}: {
  page: Page;
  ops: ReturnType<typeof usePaymentOperations>;
}) {
  const meta = PAGE_META[page];
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-subtitle">{meta.subtitle}</div>
      </div>
      <div className="topbar-right">
        {ops.error && (
          <span
            className="badge badge-red"
            style={{ cursor: "pointer" }}
            onClick={ops.clearError}
          >
            ⚠ {ops.error.slice(0, 40)}… ✕
          </span>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Overview Page
// ---------------------------------------------------------------------------
function OverviewPage({
  shopperRef,
  config,
  setPage,
}: {
  shopperRef: string;
  config: AdyenHooksConfig;
  setPage: (p: Page) => void;
}) {
  const { payments } = usePayments({ shopperReference: shopperRef, config });
  const { paymentMethods } = useStoredPaymentMethods({
    shopperReference: shopperRef,
    config,
  });

  const txs = payments as PaymentTransaction[];
  const captured   = txs.filter((p) => p.status === "captured");
  const authorised = txs.filter((p) => p.status === "authorised");
  const refunded   = txs.filter((p) => p.status === "refunded");
  const currency   = txs[0]?.currency ?? "EUR";
  const volume     = captured.reduce((a, p) => a + p.amount, 0)
                   + authorised.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="content-area animate-in">
      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-shine" />
          <div className="kpi-header">
            <span className="kpi-label">Total Volume</span>
            <span className="kpi-icon-wrap kpi-icon-purple">💜</span>
          </div>
          <div className="kpi-value">{fmtCurrency(volume, currency)}</div>
          <div className="kpi-sub">Auth + captured</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-shine" />
          <div className="kpi-header">
            <span className="kpi-label">Transactions</span>
            <span className="kpi-icon-wrap kpi-icon-blue">📊</span>
          </div>
          <div className="kpi-value">{txs.length}</div>
          <div className="kpi-sub">All time</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-shine" />
          <div className="kpi-header">
            <span className="kpi-label">Captured</span>
            <span className="kpi-icon-wrap kpi-icon-green">✅</span>
          </div>
          <div className="kpi-value">{captured.length}</div>
          <div className="kpi-sub kpi-trend up">
            {authorised.length > 0 && `+ ${authorised.length} pending`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-shine" />
          <div className="kpi-header">
            <span className="kpi-label">Saved Cards</span>
            <span className="kpi-icon-wrap kpi-icon-amber">💳</span>
          </div>
          <div className="kpi-value">{paymentMethods.length}</div>
          <div className="kpi-sub">Tokenised methods</div>
        </div>
      </div>

      {/* Quick actions + recent */}
      <div className="grid-2">
        {/* Quick Actions */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">⚡</span>
              Quick Actions
            </span>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "New Checkout Session", page: "checkout" as Page, icon: "⊕", cls: "btn-primary" },
              { label: "Manage Saved Cards",   page: "cards"    as Page, icon: "▤", cls: "btn-ghost" },
              { label: "View All Transactions",page: "transactions" as Page, icon: "≡", cls: "btn-ghost" },
              { label: "Shopper Settings",     page: "shopper"  as Page, icon: "◉", cls: "btn-ghost" },
            ].map((a) => (
              <button
                key={a.page}
                className={`btn ${a.cls} btn-full`}
                id={`quick-action-${a.page}`}
                style={{ justifyContent: "flex-start", gap: "0.75rem" }}
                onClick={() => setPage(a.page)}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">🕐</span>
              Recent Activity
            </span>
            <button
              className="btn btn-ghost btn-sm"
              id="view-all-transactions-btn"
              onClick={() => setPage("transactions")}
            >
              View all →
            </button>
          </div>
          {txs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <p>No transactions yet. Create a checkout session to get started.</p>
            </div>
          ) : (
            <div style={{ padding: "0" }}>
              {txs.slice(0, 5).map((tx) => (
                <div
                  key={tx.pspReference}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.875rem 1.5rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", flex: 1, minWidth: 0 }}>
                    <span
                      className="mono"
                      style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {tx.pspReference.slice(0, 14)}…
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {fmtDate(tx.created)}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {fmtCurrency(tx.amount, tx.currency)}
                  </span>
                  <span className={`badge ${STATUS_BADGE[tx.status] ?? "badge-muted"}`}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-icon">📊</span>
            Status Breakdown
          </span>
        </div>
        <div className="panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Authorised",  count: authorised.length,           badge: "badge-amber" },
              { label: "Captured",    count: captured.length,             badge: "badge-green" },
              { label: "Refunded",    count: refunded.length,             badge: "badge-blue"  },
              { label: "Cancelled",   count: txs.filter(p => p.status === "cancelled").length, badge: "badge-muted" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.125rem 1.25rem",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {s.count}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <span className={`badge badge-sm ${s.badge}`}>{s.label.toLowerCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Shopper Panel
// ---------------------------------------------------------------------------
function ShopperPage({
  shopperRef,
  setShopperRef,
  email,
  setEmail,
  name,
  setName,
  config,
}: {
  shopperRef: string;
  setShopperRef: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  config: AdyenHooksConfig;
}) {
  const { shopper, isLoading, register } = useAdyenShopper({
    shopperReference: shopperRef,
    config,
  });

  const handleRegister = () =>
    register({ userId: shopperRef, email, name }).catch(() => undefined);

  return (
    <div className="content-area animate-in">
      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">◉</span>
              Shopper Identity
            </span>
            {shopper ? (
              <span className="badge badge-green pulse-dot">Active</span>
            ) : (
              <span className="badge badge-amber">Not synced</span>
            )}
          </div>
          <div className="panel-body">
            <div className="field">
              <label className="field-label">Shopper Reference</label>
              <input
                id="shopper-ref-input"
                className="input"
                value={shopperRef}
                onChange={(e) => setShopperRef(e.target.value)}
                placeholder="user_abc123"
              />
              <span className="field-hint">Unique ID used in all Adyen API calls</span>
            </div>
            <div className="field">
              <label className="field-label">Email Address</label>
              <input
                id="shopper-email-input"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shopper@example.com"
              />
            </div>
            <div className="field">
              <label className="field-label">Display Name</label>
              <input
                id="shopper-name-input"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <Btn
                className="btn btn-primary btn-full"
                loading={isLoading}
                onClick={handleRegister}
                id="register-shopper-btn"
              >
                {shopper ? "Update Shopper" : "Register Shopper"}
              </Btn>
            </div>

            {shopper && (
              <div className="shopper-status">
                <span className="badge badge-green pulse-dot">Connected</span>
                <strong>ID:</strong>
                <span className="mono">{shopperRef}</span>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">ℹ</span>
              About Shoppers
            </span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              A <strong style={{ color: "var(--text-primary)" }}>Shopper</strong> represents a customer in Adyen's system.
              The shopper reference is a unique identifier that links stored payment
              methods and transaction history to a single customer profile.
            </p>
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { icon: "🔑", title: "Unique Reference", desc: "Used across all Adyen API calls for this customer" },
                { icon: "💳", title: "Stored Cards",     desc: "Linked to recurring payment tokens (COF)" },
                { icon: "📜", title: "Audit Trail",      desc: "All transactions are recorded in Convex" },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.875rem",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Checkout Panel
// ---------------------------------------------------------------------------
function CheckoutPage({
  shopperRef,
  config,
}: {
  shopperRef: string;
  config: AdyenHooksConfig;
}) {
  const [amount, setAmount]     = useState(5000);
  const [currency, setCurrency] = useState("EUR");
  const [tab, setTab]           = useState<"dropin" | "link">("dropin");
  const [session, setSession]   = useState<{
    sessionId: string;
    sessionData: string;
    url: string | null;
  } | null>(null);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);

  const ops = usePaymentOperations(config);

  const handleCreateSession = async () => {
    const result = await ops.createCheckoutSession({
      amount,
      currency,
      shopperReference: shopperRef,
    });
    setSession(result);
    setPaymentResult(null);
  };

  const clientKey = import.meta.env.VITE_ADYEN_CLIENT_KEY as string | undefined;

  const getCountryCode = (curr: string) => {
    switch (curr) {
      case "USD": return "US";
      case "GBP": return "GB";
      default:    return "NL";
    }
  };

  const { containerRef, mountError } = useAdyenDropin({
    clientKey: clientKey ?? "",
    sessionId: session?.sessionId ?? null,
    sessionData: session?.sessionData ?? null,
    environment: "test",
    countryCode: getCountryCode(currency),
    onPaymentCompleted: (result: { resultCode: string }) =>
      setPaymentResult(result.resultCode),
    onError: (err: { name: string; message: string }) =>
      setPaymentResult(`Error: ${err.message}`),
  });

  return (
    <div className="content-area animate-in">
      <div className="grid-2">
        {/* Config */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">⊕</span>
              Session Configuration
            </span>
            {session && <span className="badge badge-accent">Session active</span>}
          </div>
          <div className="panel-body">
            <div className="field">
              <label className="field-label">Amount (minor units)</label>
              <input
                id="checkout-amount-input"
                className="input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              />
              <span className="amount-display">{fmtCurrency(amount, currency)}</span>
            </div>
            <div className="field">
              <label className="field-label">Currency</label>
              <select
                id="checkout-currency-select"
                className="select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <Btn
              className="btn btn-primary btn-full"
              style={{ marginTop: "1.5rem" }}
              loading={ops.isLoading("checkout")}
              onClick={handleCreateSession}
              id="create-checkout-session-btn"
            >
              {session ? "New Session" : "Create Checkout Session"}
            </Btn>

            {paymentResult && (
              <div className="success-banner" style={{ marginTop: "1rem" }}>
                <span>🎉</span>
                <span>
                  Payment result: <strong>{paymentResult}</strong>
                </span>
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
        </div>

        {/* Drop-in / Link */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span className="panel-icon">💳</span>
              Payment Form
            </span>
          </div>
          <div className="panel-body">
            {session ? (
              <>
                <div className="tab-bar">
                  <button
                    id="tab-dropin"
                    className={`tab${tab === "dropin" ? " active" : ""}`}
                    onClick={() => setTab("dropin")}
                  >
                    Adyen Drop-in
                  </button>
                  <button
                    id="tab-link"
                    className={`tab${tab === "link" ? " active" : ""}`}
                    onClick={() => setTab("link")}
                  >
                    Redirect Link
                  </button>
                </div>

                {tab === "dropin" ? (
                  clientKey ? (
                    mountError ? (
                      <div className="error-banner">
                        ⚠ Drop-in mount error: {mountError}
                      </div>
                    ) : (
                      <div className="adyen-dropin-wrapper">
                        <div ref={containerRef} id="adyen-dropin-container" />
                      </div>
                    )
                  ) : (
                    <div className="tips-box">
                      <strong>VITE_ADYEN_CLIENT_KEY not set.</strong>
                      <br />
                      Add it to your <code>.env.local</code> to enable the embedded
                      Drop-in component.
                      <br />
                      Use the "Redirect Link" tab to pay via Adyen's hosted page.
                    </div>
                  )
                ) : (
                  <div style={{ marginTop: "0.5rem" }}>
                    {session.url ? (
                      <a
                        id="adyen-hosted-checkout-link"
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
            ) : (
              <div className="dropin-placeholder">
                <div className="dropin-placeholder-icon">💳</div>
                <p>
                  Create a checkout session to embed the Adyen Drop-in or get a
                  hosted redirect link.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Saved Cards Page
// ---------------------------------------------------------------------------
function SavedCardsPage({
  shopperRef,
  config,
  ops,
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
    const result = await ops
      .chargeCard({
        shopperReference: shopperRef,
        recurringDetailReference: ref,
        amount: chargeAmount,
        currency: chargeCurrency,
      })
      .catch(() => null);
    if (result) {
      alert(`Result: ${result.resultCode}\nPSP: ${result.pspReference ?? "—"}`);
    }
  };

  return (
    <div className="content-area animate-in">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-icon">▤</span>
            Tokenised Cards
            {paymentMethods.length > 0 && (
              <span className="badge badge-accent" style={{ marginLeft: "0.5rem" }}>
                {paymentMethods.length}
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select
              id="charge-currency-select"
              className="select"
              style={{ width: "auto", fontSize: "0.8rem", padding: "0.35rem 2rem 0.35rem 0.625rem" }}
              value={chargeCurrency}
              onChange={(e) => setChargeCurrency(e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
            <input
              id="charge-amount-input"
              className="input"
              type="number"
              style={{ width: "100px", fontSize: "0.8rem", padding: "0.35rem 0.625rem" }}
              value={chargeAmount}
              onChange={(e) => setChargeAmount(parseInt(e.target.value) || 0)}
              placeholder="Minor units"
            />
            <Btn
              id="sync-cards-btn"
              className="btn btn-ghost btn-sm"
              loading={isSyncing}
              onClick={sync}
            >
              ↻ Sync
            </Btn>
          </div>
        </div>

        <div className="panel-body">
          {paymentMethods.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🪪</div>
              <p>
                No stored cards found. Complete a checkout with card-saving enabled
                to tokenise a payment method.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {paymentMethods.map((method: StoredCard) => (
                <div
                  className="credit-card"
                  key={method.recurringDetailReference}
                  id={`card-${method.recurringDetailReference}`}
                >
                  <div className="credit-card-header">
                    <span className="credit-card-network">{method.variant}</span>
                    <span
                      className={`badge badge-sm ${
                        method.status === "active" ? "badge-green" : "badge-red"
                      }`}
                    >
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
                    <span className="badge badge-muted badge-sm">Saved</span>
                  </div>

                  <div className="credit-card-token mono">
                    {method.recurringDetailReference}
                  </div>

                  <div className="credit-card-actions">
                    <Btn
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      loading={ops.isLoading(
                        `charge:${method.recurringDetailReference}`
                      )}
                      onClick={() => handleCharge(method.recurringDetailReference)}
                    >
                      Charge {fmtCurrency(chargeAmount, chargeCurrency)}
                    </Btn>
                    <Btn
                      className="btn btn-danger btn-sm btn-icon-only"
                      onClick={() => {
                        if (confirm("Remove this stored card?"))
                          remove(method.recurringDetailReference);
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
      </div>

      {/* Charge info */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-icon">ℹ</span>
            Card-on-File Charging
          </span>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>
            Charge a stored card by selecting the amount and currency above,
            then clicking the charge button on any card below. This triggers a
            merchant-initiated transaction (MIT) via Adyen's recurring payment API.
          </p>
          <div className="tips-box" style={{ marginTop: 0 }}>
            <strong>Note:</strong> In test mode, all charges return{" "}
            <code>Authorised</code> immediately. Use the Transactions page to
            capture or refund.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Transactions Page
// ---------------------------------------------------------------------------
function TransactionsPage({
  shopperRef,
  config,
  ops,
}: {
  shopperRef: string;
  config: AdyenHooksConfig;
  ops: ReturnType<typeof usePaymentOperations>;
}) {
  const { payments } = usePayments({ shopperReference: shopperRef, config });
  const txs = payments as PaymentTransaction[];

  const captured   = txs.filter((p) => p.status === "captured").length;
  const authorised = txs.filter((p) => p.status === "authorised").length;
  const refunded   = txs.filter((p) => p.status === "refunded").length;
  const currency   = txs[0]?.currency ?? "EUR";
  const volume     = txs
    .filter((p) => p.status === "authorised" || p.status === "captured")
    .reduce((a, p) => a + p.amount, 0);

  return (
    <div className="content-area animate-in">
      {/* Stats row */}
      <div className="kpi-grid">
        {[
          { label: "Total",        value: txs.length,               sub: "transactions",     iconCls: "kpi-icon-blue"   },
          { label: "Authorised",   value: authorised,               sub: "awaiting capture", iconCls: "kpi-icon-amber"  },
          { label: "Captured",     value: captured,                 sub: "settled",          iconCls: "kpi-icon-green"  },
          { label: "Total Volume", value: fmtCurrency(volume, currency), sub: "auth + captured", iconCls: "kpi-icon-purple" },
        ].map((s) => (
          <div className="kpi-card" key={s.label}>
            <div className="kpi-card-shine" />
            <div className="kpi-header">
              <span className="kpi-label">{s.label}</span>
              <span className={`kpi-icon-wrap ${s.iconCls}`}>📊</span>
            </div>
            <div className="kpi-value" style={{ fontSize: typeof s.value === "string" ? "1.35rem" : "2rem" }}>
              {s.value}
            </div>
            <div className="kpi-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-icon">≡</span>
            All Transactions
            {txs.length > 0 && (
              <span className="badge badge-muted" style={{ marginLeft: "0.5rem" }}>
                {txs.length}
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {refunded > 0 && `${refunded} refunded`}
            </span>
          </div>
        </div>

        {txs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <p>
              No transactions yet. Create a checkout session or charge a stored
              card to see data here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
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
                {txs.map((tx) => {
                  const isAuthorised = tx.status === "authorised";
                  const isCaptured   = tx.status === "captured";
                  const badgeClass   = STATUS_BADGE[tx.status] ?? "badge-muted";

                  return (
                    <tr key={tx.pspReference} id={`tx-row-${tx.pspReference}`}>
                      <td>
                        <span
                          className="mono"
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                          }}
                        >
                          {tx.pspReference.slice(0, 16)}…
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                        {tx.merchantReference}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {fmtCurrency(tx.amount, tx.currency)}
                      </td>
                      <td>
                        <span
                          className="badge badge-muted badge-sm"
                          style={{ textTransform: "uppercase" }}
                        >
                          {tx.paymentMethod ?? "scheme"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{tx.status}</span>
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(tx.created)}
                      </td>
                      <td>
                        <div className="tx-actions">
                          {isAuthorised && (
                            <>
                              <Btn
                                className="btn btn-success btn-sm"
                                loading={ops.isLoading(`capture:${tx.pspReference}`)}
                                onClick={() =>
                                  ops.capture({
                                    pspReference: tx.pspReference,
                                    amount: tx.amount,
                                    currency: tx.currency,
                                  })
                                }
                              >
                                Capture
                              </Btn>
                              <Btn
                                className="btn btn-danger btn-sm"
                                loading={ops.isLoading(`cancel:${tx.pspReference}`)}
                                onClick={() =>
                                  ops.cancel({ pspReference: tx.pspReference })
                                }
                              >
                                Cancel
                              </Btn>
                            </>
                          )}
                          {isCaptured && (
                            <Btn
                              className="btn btn-ghost btn-sm"
                              loading={ops.isLoading(`refund:${tx.pspReference}`)}
                              onClick={() =>
                                ops.refund({
                                  pspReference: tx.pspReference,
                                  amount: tx.amount,
                                  currency: tx.currency,
                                })
                              }
                            >
                              Refund
                            </Btn>
                          )}
                          {!isAuthorised && !isCaptured && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              —
                            </span>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing Page (full)
// ---------------------------------------------------------------------------
function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing-page">
      <LandingNav onEnter={onEnter} />
      <Hero onEnter={onEnter} />
      <FeaturesSection />
      <PricingSection config={hooksConfig} />
      <footer className="landing-footer">
        <div className="footer-copy">
          © 2025 Adyen Convex · Payment Component Demo
        </div>
        <div className="footer-links">
          <a
            href="https://github.com/get-convex/adyen-payments"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://docs.convex.dev"
            target="_blank"
            rel="noreferrer"
          >
            Convex Docs
          </a>
          <a
            href="https://www.adyen.com/developers"
            target="_blank"
            rel="noreferrer"
          >
            Adyen Docs
          </a>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (full)
// ---------------------------------------------------------------------------
function Dashboard({ onBack }: { onBack: () => void }) {
  const [page, setPage]           = useState<Page>("overview");
  const [shopperRef, setShopperRef] = useState("test_shopper_1");
  const [email, setEmail]           = useState("test@example.com");
  const [name, setName]             = useState("Test Shopper");

  const ops = usePaymentOperations(hooksConfig);

  const renderPage = () => {
    switch (page) {
      case "overview":
        return (
          <OverviewPage
            shopperRef={shopperRef}
            config={hooksConfig}
            setPage={setPage}
          />
        );
      case "shopper":
        return (
          <ShopperPage
            shopperRef={shopperRef}
            setShopperRef={setShopperRef}
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            config={hooksConfig}
          />
        );
      case "checkout":
        return <CheckoutPage shopperRef={shopperRef} config={hooksConfig} />;
      case "cards":
        return (
          <SavedCardsPage
            shopperRef={shopperRef}
            config={hooksConfig}
            ops={ops}
          />
        );
      case "transactions":
        return (
          <TransactionsPage
            shopperRef={shopperRef}
            config={hooksConfig}
            ops={ops}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-shell">
      <Sidebar page={page} setPage={setPage} onBack={onBack} />
      <main className="dashboard-main">
        <Topbar page={page} ops={ops} />
        {renderPage()}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  return (
    <div className="app-shell">
      {view === "landing" ? (
        <LandingPage onEnter={() => setView("dashboard")} />
      ) : (
        <Dashboard onBack={() => setView("landing")} />
      )}
    </div>
  );
}
