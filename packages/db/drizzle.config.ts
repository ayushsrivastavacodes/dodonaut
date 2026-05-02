import type { Config } from "drizzle-kit";

// drizzle-kit doesn't natively serialize BigInts in defaults. Polyfill here
// so generate/push/migrate can stringify our bigint .default(0n) columns.
// See: https://github.com/drizzle-team/drizzle-orm/issues/1234
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config;
