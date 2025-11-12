-- CreateEnum
CREATE TYPE "public"."BranchType" AS ENUM ('SUCCESS', 'FAILURE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "public"."NextAction" AS ENUM ('CONTINUE', 'END');

-- CreateEnum
CREATE TYPE "public"."AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."scenarios" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "avatar_url" VARCHAR(255),
    "background_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenario_decisions" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "decisionOrder" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenario_choices" (
    "id" TEXT NOT NULL,
    "decision_id" TEXT NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "branch_type" "public"."BranchType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "next_action" "public"."NextAction" NOT NULL,
    "next_decision_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenario_attempts" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "public"."AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scenario_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenario_responses" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "decision_id" TEXT NOT NULL,
    "choice_id" TEXT NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scenarios_module_id_idx" ON "public"."scenarios"("module_id");

-- CreateIndex
CREATE INDEX "scenario_decisions_scenario_id_idx" ON "public"."scenario_decisions"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_choices_decision_id_idx" ON "public"."scenario_choices"("decision_id");

-- CreateIndex
CREATE INDEX "scenario_choices_next_decision_id_idx" ON "public"."scenario_choices"("next_decision_id");

-- CreateIndex
CREATE INDEX "scenario_attempts_scenario_id_idx" ON "public"."scenario_attempts"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_attempts_user_id_idx" ON "public"."scenario_attempts"("user_id");

-- CreateIndex
CREATE INDEX "scenario_responses_attempt_id_idx" ON "public"."scenario_responses"("attempt_id");

-- CreateIndex
CREATE INDEX "scenario_responses_decision_id_idx" ON "public"."scenario_responses"("decision_id");

-- CreateIndex
CREATE INDEX "scenario_responses_choice_id_idx" ON "public"."scenario_responses"("choice_id");

-- AddForeignKey
ALTER TABLE "public"."scenarios" ADD CONSTRAINT "scenarios_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_decisions" ADD CONSTRAINT "scenario_decisions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_choices" ADD CONSTRAINT "scenario_choices_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "public"."scenario_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_choices" ADD CONSTRAINT "scenario_choices_next_decision_id_fkey" FOREIGN KEY ("next_decision_id") REFERENCES "public"."scenario_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_attempts" ADD CONSTRAINT "scenario_attempts_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_attempts" ADD CONSTRAINT "scenario_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_responses" ADD CONSTRAINT "scenario_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."scenario_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_responses" ADD CONSTRAINT "scenario_responses_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "public"."scenario_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenario_responses" ADD CONSTRAINT "scenario_responses_choice_id_fkey" FOREIGN KEY ("choice_id") REFERENCES "public"."scenario_choices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
