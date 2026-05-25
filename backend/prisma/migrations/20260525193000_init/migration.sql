-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LostReportStatus" AS ENUM ('RECEIVED', 'MATCH_CANDIDATE', 'FOUND', 'CLOSED');

-- CreateEnum
CREATE TYPE "FoundItemStatus" AS ENUM ('REGISTERED', 'STORED', 'PICKUP_WAITING', 'PICKUP_COMPLETED', 'DISPOSAL_PENDING');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('ACTIVE', 'CONFIRM_REQUESTED', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('WAITING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickupCancelReason" AS ENUM ('REPORTER_CANCELLED', 'MANAGER_CANCELLED', 'SYSTEM_AUTO_CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "pending_approval" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lost_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reporter_name" TEXT NOT NULL,
    "reporter_contact" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lost_place" TEXT NOT NULL,
    "lost_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LostReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lost_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "found_items" (
    "id" UUID NOT NULL,
    "finder_id" UUID,
    "finder_name" TEXT,
    "finder_contact" TEXT,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "found_place" TEXT NOT NULL,
    "found_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "storage_location" TEXT,
    "status" "FoundItemStatus" NOT NULL DEFAULT 'REGISTERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "found_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "score" DECIMAL(5,2),
    "reject_reason" TEXT,
    "requested_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickups" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "pickup_code" TEXT NOT NULL,
    "status" "PickupStatus" NOT NULL DEFAULT 'WAITING',
    "waiting_started_at" TIMESTAMP(3) NOT NULL,
    "auto_cancel_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" "PickupCancelReason",
    "verifier_id" UUID,

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "long_unclaimed_days" INTEGER NOT NULL DEFAULT 30,
    "pickup_auto_cancel_days" INTEGER NOT NULL DEFAULT 3,
    "match_date_range_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "lost_reports_reporter_id_created_at_idx" ON "lost_reports"("reporter_id", "created_at");

-- CreateIndex
CREATE INDEX "lost_reports_status_created_at_idx" ON "lost_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "lost_reports_category_lost_at_idx" ON "lost_reports"("category", "lost_at");

-- CreateIndex
CREATE INDEX "found_items_finder_id_created_at_idx" ON "found_items"("finder_id", "created_at");

-- CreateIndex
CREATE INDEX "found_items_status_created_at_idx" ON "found_items"("status", "created_at");

-- CreateIndex
CREATE INDEX "found_items_category_found_at_idx" ON "found_items"("category", "found_at");

-- CreateIndex
CREATE INDEX "found_items_storage_location_idx" ON "found_items"("storage_location");

-- CreateIndex
CREATE UNIQUE INDEX "matches_report_id_item_id_key" ON "matches"("report_id", "item_id");

-- CreateIndex
CREATE INDEX "matches_report_id_status_idx" ON "matches"("report_id", "status");

-- CreateIndex
CREATE INDEX "matches_item_id_status_idx" ON "matches"("item_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_request_per_report" ON "matches"("report_id") WHERE "status" IN ('CONFIRM_REQUESTED', 'APPROVED');

-- CreateIndex
CREATE UNIQUE INDEX "pickups_match_id_key" ON "pickups"("match_id");

-- CreateIndex
CREATE INDEX "pickups_status_auto_cancel_at_idx" ON "pickups"("status", "auto_cancel_at");

-- CreateIndex
CREATE INDEX "pickups_report_id_idx" ON "pickups"("report_id");

-- CreateIndex
CREATE INDEX "pickups_item_id_idx" ON "pickups"("item_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "lost_reports" ADD CONSTRAINT "lost_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_finder_id_fkey" FOREIGN KEY ("finder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "lost_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "found_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "lost_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "found_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
