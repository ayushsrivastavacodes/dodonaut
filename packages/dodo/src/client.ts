import DodoPayments from "dodopayments";

let _client: DodoPayments | null = null;

/**
 * Singleton Dodo SDK client.
 * Reads `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_ENVIRONMENT` from env.
 * On Day 1-5: test_mode. On Day 6+: live_mode.
 */
export function getDodoClient(): DodoPayments {
  if (!_client) {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      throw new Error("DODO_PAYMENTS_API_KEY is not set");
    }
    const environment =
      (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
      "test_mode";
    _client = new DodoPayments({
      bearerToken: apiKey,
      environment,
    });
  }
  return _client;
}
