#!/usr/bin/env bun
/**
 * V2 — Probe Dodo Payments /events/ingest with an arbitrary customer_id
 * (not matching any existing Dodo customer record).
 *
 * Run once you have DODO_PAYMENTS_API_KEY in your environment:
 *   DODO_PAYMENTS_API_KEY=dodo_test_xxx bun scripts/v2-probe-dodo-events.ts
 *
 * Pass criterion (Path A): response is { ingested_count: 1 }, no error.
 * Fail criterion (Path B required): 4xx with "customer not found" or similar.
 *
 * If Path B is required:
 *   - on signup, after Better-Auth Dodo plugin auto-creates user's Dodo customer,
 *     make a second dodo.customers.create() call to mint a sentinel customer
 *     and store its cus_xxx in merchants.dodo_agents_customer_id
 *   - pass that ID as sentinelCustomerId to ingestSettlement()
 */
import DodoPayments from "dodopayments";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
if (!apiKey) {
  console.error("DODO_PAYMENTS_API_KEY required");
  process.exit(2);
}

const environment =
  (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
  "test_mode";

const dodo = new DodoPayments({ bearerToken: apiKey, environment });

const eventId = `dodonaut_v2_probe_${Date.now()}`;
const customerId = `dodonaut_agent_TEST_${Math.random().toString(36).slice(2, 10)}`;

console.log("Probing Dodo /events/ingest");
console.log(`  environment: ${environment}`);
console.log(`  event_id: ${eventId}`);
console.log(`  customer_id (synthetic): ${customerId}`);

try {
  const result = await dodo.usageEvents.ingest({
    events: [
      {
        event_id: eventId,
        customer_id: customerId,
        event_name: "dodonaut.v2_probe",
        timestamp: new Date().toISOString(),
        metadata: {
          v2_probe: "true",
          synthetic_customer: "true",
        },
      },
    ],
  });
  console.log("\n=== V2 Verdict ===");
  console.log("Result:", JSON.stringify(result, null, 2));
  if (result.ingested_count >= 1) {
    console.log("✅ PATH A WORKS — Dodo accepts arbitrary customer_id");
    console.log("   No code changes needed. Reconciler uses dodonaut_agent_<wallet> directly.");
    process.exit(0);
  } else {
    console.log("⚠️  Ingested count was 0 — investigate.");
    process.exit(1);
  }
} catch (err) {
  console.log("\n=== V2 Verdict ===");
  console.log("❌ PATH A FAILED — falling back to PATH B (sentinel customer per merchant)");
  console.log("Error:", err);
  console.log("\nAction items:");
  console.log("  1. On signup (apps/web), after Better-Auth Dodo plugin creates user's Dodo customer,");
  console.log("     make a second call: dodo.customers.create({email: agents+slug@dodonaut.xyz, ...})");
  console.log("  2. Store returned cus_xxx in merchants.dodo_agents_customer_id");
  console.log("  3. Pass it as sentinelCustomerId to ingestSettlement()");
  console.log("  4. Schema column is already pre-added — no migration needed.");
  process.exit(1);
}
