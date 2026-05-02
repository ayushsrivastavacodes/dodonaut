/**
 * Better-Auth + @dodopayments/better-auth + Drizzle (Postgres on Neon).
 *
 * On signup:
 *   1. Better-Auth creates a row in `users` (Drizzle-managed).
 *   2. The Dodo plugin's `createCustomerOnSignUp: true` fires `dodo.customers.create`
 *      with the user's email + name. The returned cus_xxx is stored by the plugin.
 *   3. We lazily create a `merchants` row on first dashboard load (see lib/merchant.ts)
 *      — handles cases where Dodo customer creation lagged or retried.
 *
 * Webhook receiver auto-mounts at /api/auth/dodopayments/webhooks (Standard Webhooks
 * signature verification handled by the plugin).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  dodopayments,
  checkout,
  portal,
  usage,
  webhooks,
} from "@dodopayments/better-auth";
import DodoPayments from "dodopayments";
import { getDb } from "@dodonaut/db/client";
import * as schema from "@dodonaut/db/schema";

if (!process.env.DODO_PAYMENTS_API_KEY) {
  throw new Error("DODO_PAYMENTS_API_KEY is required");
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment:
    (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
    "test_mode",
});

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    dodopayments({
      client: dodo,
      createCustomerOnSignUp: true,
      getCustomerParams: (user) => ({
        metadata: { dodonaut_merchant_user_id: user.id },
      }),
      use: [
        portal(),
        usage(),
        webhooks({
          webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? "",
          onPaymentSucceeded: async (payload) => {
            console.log("[dodo] payment.succeeded", payload?.data?.payment_id);
          },
          onPaymentFailed: async (payload) => {
            console.warn("[dodo] payment.failed", payload?.data?.payment_id);
          },
          onRefundSucceeded: async (payload) => {
            console.log("[dodo] refund.succeeded", payload?.data?.refund_id);
          },
        }),
      ],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
