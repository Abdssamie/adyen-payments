import { defineApp } from "convex/server";
import adyenPayments from "@abdssamie/adyen-payments/convex.config.js";

const app = defineApp();
app.use(adyenPayments, { httpPrefix: "/comments/" });

export default app;
