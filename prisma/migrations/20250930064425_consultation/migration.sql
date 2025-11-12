-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('CONSULTATION', 'WEBSITE_NORMAL', 'WEBSITE_PREMIUM');

-- AlterEnum
ALTER TYPE "public"."GroupType" ADD VALUE 'PRIVATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."UnlockType" ADD VALUE 'CONSULTATION';
ALTER TYPE "public"."UnlockType" ADD VALUE 'WEBSITE_SERVICES';

-- CreateTable
CREATE TABLE "public"."group_invitations" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_pricing" (
    "id" TEXT NOT NULL,
    "unlock_type" "public"."UnlockType" NOT NULL,
    "service_key" "public"."ServiceType" NOT NULL,
    "credits" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consultation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "pricing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_service" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pricing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_invitations_token_key" ON "public"."group_invitations"("token");

-- CreateIndex
CREATE INDEX "group_invitations_group_id_idx" ON "public"."group_invitations"("group_id");

-- CreateIndex
CREATE INDEX "group_invitations_invitee_id_status_idx" ON "public"."group_invitations"("invitee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_pricing_unlock_type_service_key_key" ON "public"."credit_pricing"("unlock_type", "service_key");

-- AddForeignKey
ALTER TABLE "public"."group_invitations" ADD CONSTRAINT "group_invitations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_invitations" ADD CONSTRAINT "group_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_invitations" ADD CONSTRAINT "group_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultation" ADD CONSTRAINT "consultation_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "public"."credit_pricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultation" ADD CONSTRAINT "consultation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_service" ADD CONSTRAINT "website_service_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "public"."credit_pricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_service" ADD CONSTRAINT "website_service_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
