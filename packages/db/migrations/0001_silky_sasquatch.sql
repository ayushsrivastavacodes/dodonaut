ALTER TABLE "endpoints" ALTER COLUMN "accepted_assets" SET DEFAULT '{"USDC","USDG"}';--> statement-breakpoint
ALTER TABLE "merchants" ALTER COLUMN "default_settlement_asset" SET DEFAULT 'USDC';