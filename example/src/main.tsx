import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { authClient } from "./lib/auth-client";
import App from "./App";
import "./index.css";
import "@adyen/adyen-web/styles/adyen.css";

const address = import.meta.env.VITE_CONVEX_URL;

const convex = new ConvexReactClient(address);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
