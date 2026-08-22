ALTER TABLE "apikey" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "passkey" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "apikey" CASCADE;--> statement-breakpoint
DROP TABLE "passkey" CASCADE;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "email_config" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "rate_limit" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "team_member" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();