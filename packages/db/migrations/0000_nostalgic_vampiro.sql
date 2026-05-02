CREATE TYPE "public"."dodo_environment" AS ENUM('test_mode', 'live_mode');--> statement-breakpoint
CREATE TYPE "public"."endpoint_mode" AS ENUM('x402', 'human', 'both');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'settled', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('one_time', 'subscription', 'usage');--> statement-breakpoint
CREATE TYPE "public"."settlement_asset" AS ENUM('USDG', 'USDC');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_wallets" (
	"pubkey" text PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL,
	"total_spent_usd_base_units" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"upstream_url" text NOT NULL,
	"price_usd_base_units" bigint NOT NULL,
	"accepted_assets" text[] DEFAULT '{"USDG","USDC"}' NOT NULL,
	"description" text,
	"mode" "endpoint_mode" DEFAULT 'x402' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"dodo_customer_id" text NOT NULL,
	"dodo_agents_customer_id" text,
	"dodo_api_key_encrypted" text NOT NULL,
	"dodo_webhook_key_encrypted" text NOT NULL,
	"dodo_environment" "dodo_environment" DEFAULT 'test_mode' NOT NULL,
	"solana_address" text NOT NULL,
	"default_settlement_asset" "settlement_asset" DEFAULT 'USDG' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "on_chain_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid,
	"merchant_id" uuid NOT NULL,
	"signature" text NOT NULL,
	"block_time" timestamp with time zone NOT NULL,
	"agent_wallet" text NOT NULL,
	"amount_base_units" bigint NOT NULL,
	"asset" "settlement_asset" NOT NULL,
	"network" text NOT NULL,
	"end_to_end_latency_ms" integer,
	"raw_helius_event" jsonb,
	"dodo_event_id" text,
	"dodo_ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"dodo_product_id" text NOT NULL,
	"dodo_meter_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "product_type" NOT NULL,
	"price_usd_base_units" bigint NOT NULL,
	"raw_dodo_product" jsonb,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_chain_receipts" ADD CONSTRAINT "on_chain_receipts_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_chain_receipts" ADD CONSTRAINT "on_chain_receipts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "endpoints_merchant_id_idx" ON "endpoints" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "endpoints_product_id_idx" ON "endpoints" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_slug_idx" ON "merchants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_user_id_idx" ON "merchants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "merchants_solana_address_idx" ON "merchants" USING btree ("solana_address");--> statement-breakpoint
CREATE UNIQUE INDEX "on_chain_receipts_signature_idx" ON "on_chain_receipts" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "on_chain_receipts_merchant_id_idx" ON "on_chain_receipts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "on_chain_receipts_agent_wallet_idx" ON "on_chain_receipts" USING btree ("agent_wallet");--> statement-breakpoint
CREATE INDEX "on_chain_receipts_endpoint_id_idx" ON "on_chain_receipts" USING btree ("endpoint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_dodo_product_idx" ON "products" USING btree ("merchant_id","dodo_product_id");--> statement-breakpoint
CREATE INDEX "products_merchant_id_idx" ON "products" USING btree ("merchant_id");