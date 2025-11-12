-- CreateEnum
CREATE TYPE "public"."OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- AlterTable
ALTER TABLE "public"."asset_category" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."assets" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."catalogs" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."event" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."groups" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "annual_price" DECIMAL(10,2),
ADD COLUMN     "credit" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "logo_url" VARCHAR(300),
ADD COLUMN     "monthly_price" DECIMAL(10,2),
ADD COLUMN     "status" "public"."OrgStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "storage_limit" BIGINT,
ADD COLUMN     "user_limit" INTEGER;

-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."support_ticket" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "organization_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalogs" ADD CONSTRAINT "catalogs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event" ADD CONSTRAINT "event_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket" ADD CONSTRAINT "support_ticket_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
