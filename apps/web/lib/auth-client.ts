"use client";

import { createAuthClient } from "better-auth/react";
import { dodopaymentsClient } from "@dodopayments/better-auth";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_DODONAUT_BASE_URL ?? "http://localhost:3000",
  plugins: [dodopaymentsClient()],
});

export const { signIn, signOut, useSession } = authClient;
