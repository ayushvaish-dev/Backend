-- AlterEnum
ALTER TYPE "public"."MessageType" ADD VALUE 'POLL';

-- AlterTable
ALTER TABLE "public"."chat_message" ADD COLUMN     "isRead" BOOLEAN DEFAULT false,
ADD COLUMN     "type" "public"."MessageType" DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "public"."group_message" ADD COLUMN     "poll_allow_multiple" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poll_expires_at" TIMESTAMP(3),
ADD COLUMN     "poll_is_anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poll_question" TEXT;

-- AlterTable
ALTER TABLE "public"."groups" ADD COLUMN     "thumbnail" VARCHAR(300);

-- CreateTable
CREATE TABLE "public"."poll_options" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."poll_votes" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_message_id_user_id_option_id_key" ON "public"."poll_votes"("message_id", "user_id", "option_id");

-- AddForeignKey
ALTER TABLE "public"."poll_options" ADD CONSTRAINT "poll_options_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."group_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."poll_votes" ADD CONSTRAINT "poll_votes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."group_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."poll_votes" ADD CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
