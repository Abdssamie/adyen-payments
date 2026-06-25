import { defineApp } from "convex/server";
import adyenPayments from "@abdssamie/adyen-payments/convex.config.js";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(adyenPayments);
app.use(betterAuth);

export default app;
