-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."auth_provider_enum" AS ENUM ('local', 'google');

-- CreateEnum
CREATE TYPE "public"."gender_enum" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "public"."role_enum" AS ENUM ('user', 'admin', 'instructor');

-- CreateEnum
CREATE TYPE "public"."ResourceType" AS ENUM ('VIDEO', 'PDF', 'TRANSCRIPT', 'AUDIO', 'LINK', 'IMAGE', 'TEXT', 'SCORM');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED', 'NOT_ATTEMPTED');

-- CreateEnum
CREATE TYPE "public"."ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."AccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GrantType" AS ENUM ('MANUAL', 'PAYMENT', 'PROMOTION');

-- CreateEnum
CREATE TYPE "public"."CourseType" AS ENUM ('SEQUENTIAL', 'OPEN');

-- CreateEnum
CREATE TYPE "public"."LockModules" AS ENUM ('LOCKED', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('GENERAL', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MCQ', 'SCQ', 'TRUE_FALSE', 'ONE_WORD', 'FILL_UPS', 'DESCRIPTIVE', 'MATCHING', 'SEQUENCE', 'CATEGORIZATION');

-- CreateEnum
CREATE TYPE "public"."AssessmentStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "public"."GroupRole" AS ENUM ('ADMIN', 'LEARNER');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('POST', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('FOR', 'AGAINST', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."EngagementType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "public"."DebateGroup" AS ENUM ('FOR', 'AGAINST');

-- CreateEnum
CREATE TYPE "public"."CalendarType" AS ENUM ('PERSONAL', 'GROUP', 'COURSE');

-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."ParticipantRole" AS ENUM ('HOST', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."ReminderMethod" AS ENUM ('EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."GradingStatus" AS ENUM ('GRADED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."TicketCategory" AS ENUM ('TECHNICAL_SUPPORT', 'BILLING_PAYMENTS', 'ACCOUNT_ISSUES', 'COURSE_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."ActivityAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'PROFILE_UPDATED', 'COURSE_COMPLETED', 'LESSON_OPENED', 'LESSON_COMPLETED', 'QUIZ_STARTED', 'QUIZ_COMPLETED', 'ASSIGNMENT_SUBMITTED', 'COMMENT_POSTED', 'DEBATE_PARTICIPATED', 'DEBATE_SUBMITTED', 'ESSAY_SUBMITTED', 'MESSAGE_SENT', 'CERTIFICATE_EARNED', 'BADGE_EARNED');

-- CreateEnum
CREATE TYPE "public"."BadgeCategoryEnum" AS ENUM ('COMPLETION', 'EXCELLENCE', 'ONE_TIME', 'PARTICIPATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCE');

-- CreateEnum
CREATE TYPE "public"."CatalogCategory" AS ENUM ('STARTER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."GroupType" AS ENUM ('UNIVERSAL', 'COURSE');

-- CreateEnum
CREATE TYPE "public"."FileType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'TEXT_FILE', 'PDF');

-- CreateEnum
CREATE TYPE "public"."UnlockType" AS ENUM ('COURSE', 'CATALOG', 'LESSON');

-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('MEMBERSHIP', 'CREDIT_PURCHASE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL DEFAULT '',
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "password" VARCHAR(255),
    "auth_provider" "public"."auth_provider_enum" NOT NULL DEFAULT 'local',
    "provider_id" VARCHAR(300),
    "gender" "public"."gender_enum",
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "image" VARCHAR(300),
    "dob" TIMESTAMP(3),
    "bio" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "location" VARCHAR(150),
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Los_Angeles',
    "social_handles" JSON,
    "total_credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "user_id" TEXT NOT NULL,
    "role" "public"."role_enum" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "order_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_id" VARCHAR(150),
    "payment_method" VARCHAR(100),
    "credits_added" INTEGER,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_session_id" VARCHAR(200),
    "type" "public"."OrderType" NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "catalogId" TEXT,
    "courseId" TEXT,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL,
    "transaction_id" VARCHAR(100),
    "payment_method" VARCHAR(50),
    "payment_url" TEXT,
    "gateway_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_instructors" (
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("course_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."course_admins" (
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "course_admins_pkey" PRIMARY KEY ("course_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."catalogs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "thumbnail" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "category" "public"."CatalogCategory" NOT NULL DEFAULT 'STARTER',
    "order" INTEGER,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."catalog_courses" (
    "catalog_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_courses_pkey" PRIMARY KEY ("catalog_id","course_id")
);

-- CreateTable
CREATE TABLE "public"."user_catalog_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "granted_by" "public"."GrantType" NOT NULL DEFAULT 'MANUAL',
    "subscription_start" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subscription_end" TIMESTAMPTZ(6),
    "status" "public"."AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "granted_on" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_catalog_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_course_access" (
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "granted_by" "public"."GrantType" NOT NULL DEFAULT 'MANUAL',
    "subscription_start" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subscription_end" TIMESTAMPTZ(6),
    "status" "public"."AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "granted_on" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_course_access_pkey" PRIMARY KEY ("user_id","course_id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "learning_objectives" TEXT[],
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "course_status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "estimated_duration" TEXT,
    "max_students" INTEGER,
    "course_level" "public"."CourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "instructor_id" TEXT,
    "courseType" "public"."CourseType" NOT NULL DEFAULT 'SEQUENTIAL',
    "deleted_at" TIMESTAMPTZ(6),
    "lockModules" "public"."LockModules" NOT NULL DEFAULT 'LOCKED',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "requireFinalQuiz" BOOLEAN NOT NULL DEFAULT true,
    "thumbnail" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."modules" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "estimated_duration" INTEGER,
    "module_status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "thumbnail" VARCHAR(300),
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lessons" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lesson_status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "estimated_duration" INTEGER,
    "module_id" TEXT NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resource" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "module_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "resource_type" "public"."ResourceType" NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "file_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_module_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "last_accessed" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "type" "public"."QuizType" NOT NULL DEFAULT 'GENERAL',
    "maxAttempts" INTEGER DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "actions" JSONB,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "min_score" INTEGER NOT NULL DEFAULT 30,
    "time_estimate" INTEGER,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "question_type" "public"."QuestionType" NOT NULL DEFAULT 'MCQ',
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "question_score" INTEGER DEFAULT 3,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_quiz_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attempt_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "submitted_at" TIMESTAMP(3),
    "last_accessed" TIMESTAMP(3),
    "status" "public"."AssessmentStatus" NOT NULL,

    CONSTRAINT "user_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "matchWith" VARCHAR(300),
    "isCorrect" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "orderIndex" INTEGER,
    "category" VARCHAR(150),
    "isCategory" BOOLEAN DEFAULT false,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_question_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selected" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(36),
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "device_info" VARCHAR(200),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chatbot_sections" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chatbot_questions" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "response" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "course_id" TEXT,
    "lesson_id" TEXT,

    CONSTRAINT "chatbot_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contactus" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "message" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "related_id" TEXT,
    "related_type" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_message" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" TEXT NOT NULL,
    "roomid" TEXT NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_participants" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "time_limit" INTEGER NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'EASY',
    "instructions" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "module_id" TEXT NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_submission" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "additional_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ontime" BOOLEAN,
    "grading_status" "public"."GradingStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "feedback" TEXT,
    "last_accessed" TIMESTAMP(3),

    CONSTRAINT "assignment_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_questions" (
    "id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "minimum_words" INTEGER,
    "maximum_words" INTEGER,
    "assignment_id" TEXT NOT NULL,

    CONSTRAINT "assignment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "course_id" TEXT,
    "group_type" "public"."GroupType" NOT NULL DEFAULT 'UNIVERSAL',

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_member" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role" "public"."GroupRole" NOT NULL DEFAULT 'LEARNER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_post" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."PostType" NOT NULL DEFAULT 'POST',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comment" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."like" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_message" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "mime_type" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debates" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "instruction" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "deleted_at" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "total_marks" INTEGER NOT NULL,

    CONSTRAINT "debates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_response" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "marks" INTEGER,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debate_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_participants" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group" "public"."DebateGroup" NOT NULL,
    "joined_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "last_accessed" TIMESTAMP(3),

    CONSTRAINT "debate_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."engagement" (
    "id" TEXT NOT NULL,
    "res_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."EngagementType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "calendarType" "public"."CalendarType",
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "creatorId" TEXT NOT NULL,
    "updatedBy" VARCHAR(150),
    "groupId" TEXT,
    "course_id" TEXT,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurrence_rule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "frequency" "public"."Frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "byDay" TEXT,
    "endDate" TIMESTAMP(3),
    "count" INTEGER,

    CONSTRAINT "recurrence_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ParticipantRole" NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "event_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "triggerTime" TIMESTAMP(3) NOT NULL,
    "method" "public"."ReminderMethod" NOT NULL,

    CONSTRAINT "reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."essays" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" VARCHAR(400) NOT NULL,
    "max_points" INTEGER NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "word_limit" INTEGER NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'EASY',
    "essay_topic" VARCHAR(400) NOT NULL,
    "passing_score" INTEGER NOT NULL DEFAULT 50,
    "instructions" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,

    CONSTRAINT "essays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."essay_submissions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "essay_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ontime" BOOLEAN,
    "time_spent" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL,
    "grading_status" "public"."GradingStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "feedback" TEXT,
    "last_accessed" TIMESTAMP(3),

    CONSTRAINT "essay_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_ticket" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category" "public"."TicketCategory" NOT NULL,
    "priority" "public"."TicketPriority" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_reply" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateUrl" TEXT NOT NULL,
    "uniqueCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "criteria" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),
    "category" "public"."BadgeCategoryEnum" NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_badges" (
    "id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(150),
    "updatedBy" VARCHAR(150),

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "public"."ActivityAction" NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson_contents" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_course_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "time_spent" INTEGER,
    "last_accessed" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurrence_exception" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrence_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" TEXT,

    CONSTRAINT "recurrence_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "url" TEXT NOT NULL,
    "file_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "file_type" "public"."FileType" NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "asset_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_module_access" (
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "module_order" INTEGER NOT NULL,
    "granted_by" "public"."GrantType" NOT NULL DEFAULT 'MANUAL',
    "subscription_start" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subscription_end" TIMESTAMPTZ(6),
    "status" "public"."AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "granted_on" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_module_access_pkey" PRIMARY KEY ("user_id","module_id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan_type" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_billing" TIMESTAMP(3),
    "canceled_at" TIMESTAMPTZ(6),
    "stripe_subscription_id" VARCHAR(200),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credits_spent" INTEGER NOT NULL,
    "unlock_type" "public"."UnlockType" NOT NULL,
    "unlock_id" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_id_key" ON "public"."users"("provider_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_last_login_idx" ON "public"."users"("last_login");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "public"."user_roles"("role");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "public"."orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "public"."orders"("order_date");

-- CreateIndex
CREATE INDEX "orders_type_idx" ON "public"."orders"("type");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "public"."order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_courseId_idx" ON "public"."order_items"("courseId");

-- CreateIndex
CREATE INDEX "order_items_catalogId_idx" ON "public"."order_items"("catalogId");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "public"."payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "public"."payments"("transaction_id");

-- CreateIndex
CREATE INDEX "course_instructors_course_id_idx" ON "public"."course_instructors"("course_id");

-- CreateIndex
CREATE INDEX "course_instructors_user_id_idx" ON "public"."course_instructors"("user_id");

-- CreateIndex
CREATE INDEX "course_admins_course_id_idx" ON "public"."course_admins"("course_id");

-- CreateIndex
CREATE INDEX "course_admins_user_id_idx" ON "public"."course_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalogs_name_key" ON "public"."catalogs"("name");

-- CreateIndex
CREATE INDEX "catalogs_name_idx" ON "public"."catalogs"("name");

-- CreateIndex
CREATE INDEX "catalog_courses_catalog_id_idx" ON "public"."catalog_courses"("catalog_id");

-- CreateIndex
CREATE INDEX "catalog_courses_course_id_idx" ON "public"."catalog_courses"("course_id");

-- CreateIndex
CREATE INDEX "user_catalog_access_user_id_idx" ON "public"."user_catalog_access"("user_id");

-- CreateIndex
CREATE INDEX "user_catalog_access_catalog_id_idx" ON "public"."user_catalog_access"("catalog_id");

-- CreateIndex
CREATE INDEX "user_course_access_user_id_status_idx" ON "public"."user_course_access"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_course_access_user_id_idx" ON "public"."user_course_access"("user_id");

-- CreateIndex
CREATE INDEX "user_course_access_course_id_idx" ON "public"."user_course_access"("course_id");

-- CreateIndex
CREATE INDEX "courses_instructor_id_idx" ON "public"."courses"("instructor_id");

-- CreateIndex
CREATE INDEX "courses_course_status_idx" ON "public"."courses"("course_status");

-- CreateIndex
CREATE INDEX "modules_course_id_idx" ON "public"."modules"("course_id");

-- CreateIndex
CREATE INDEX "resource_group_id_idx" ON "public"."resource"("group_id");

-- CreateIndex
CREATE INDEX "resource_module_id_idx" ON "public"."resource"("module_id");

-- CreateIndex
CREATE INDEX "resource_resource_type_idx" ON "public"."resource"("resource_type");

-- CreateIndex
CREATE INDEX "user_lesson_progress_user_id_idx" ON "public"."user_lesson_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "public"."user_lesson_progress"("lesson_id");

-- CreateIndex
CREATE INDEX "user_module_progress_user_id_idx" ON "public"."user_module_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_module_progress_module_id_idx" ON "public"."user_module_progress"("module_id");

-- CreateIndex
CREATE INDEX "quizzes_module_id_idx" ON "public"."quizzes"("module_id");

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_id_idx" ON "public"."quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "user_quiz_attempts_user_id_idx" ON "public"."user_quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "user_quiz_attempts_quiz_id_idx" ON "public"."user_quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "public"."question_options"("questionId");

-- CreateIndex
CREATE INDEX "quiz_question_responses_attemptId_idx" ON "public"."quiz_question_responses"("attemptId");

-- CreateIndex
CREATE INDEX "quiz_question_responses_questionId_idx" ON "public"."quiz_question_responses"("questionId");

-- CreateIndex
CREATE INDEX "logs_user_id_idx" ON "public"."logs"("user_id");

-- CreateIndex
CREATE INDEX "logs_action_idx" ON "public"."logs"("action");

-- CreateIndex
CREATE INDEX "logs_entity_idx" ON "public"."logs"("entity");

-- CreateIndex
CREATE INDEX "logs_timestamp_idx" ON "public"."logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_sections_name_key" ON "public"."chatbot_sections"("name");

-- CreateIndex
CREATE INDEX "chatbot_sections_name_idx" ON "public"."chatbot_sections"("name");

-- CreateIndex
CREATE INDEX "chatbot_questions_section_id_idx" ON "public"."chatbot_questions"("section_id");

-- CreateIndex
CREATE INDEX "chatbot_questions_course_id_idx" ON "public"."chatbot_questions"("course_id");

-- CreateIndex
CREATE INDEX "chatbot_questions_lesson_id_idx" ON "public"."chatbot_questions"("lesson_id");

-- CreateIndex
CREATE INDEX "contactus_email_idx" ON "public"."contactus"("email");

-- CreateIndex
CREATE INDEX "course_reviews_user_id_idx" ON "public"."course_reviews"("user_id");

-- CreateIndex
CREATE INDEX "course_reviews_course_id_idx" ON "public"."course_reviews"("course_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_related_type_related_id_idx" ON "public"."notifications"("related_type", "related_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submission_assignment_id_student_id_key" ON "public"."assignment_submission"("assignment_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_member_user_id_group_id_key" ON "public"."group_member"("user_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_post_id_user_id_key" ON "public"."like"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "debates_module_id_idx" ON "public"."debates"("module_id");

-- CreateIndex
CREATE INDEX "debates_status_idx" ON "public"."debates"("status");

-- CreateIndex
CREATE INDEX "debate_response_debate_id_idx" ON "public"."debate_response"("debate_id");

-- CreateIndex
CREATE INDEX "debate_participants_debate_id_idx" ON "public"."debate_participants"("debate_id");

-- CreateIndex
CREATE INDEX "debate_participants_user_id_idx" ON "public"."debate_participants"("user_id");

-- CreateIndex
CREATE INDEX "debate_participants_group_idx" ON "public"."debate_participants"("group");

-- CreateIndex
CREATE UNIQUE INDEX "debate_participants_debate_id_user_id_key" ON "public"."debate_participants"("debate_id", "user_id");

-- CreateIndex
CREATE INDEX "engagement_res_id_idx" ON "public"."engagement"("res_id");

-- CreateIndex
CREATE INDEX "engagement_user_id_idx" ON "public"."engagement"("user_id");

-- CreateIndex
CREATE INDEX "engagement_type_idx" ON "public"."engagement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_res_id_user_id_key" ON "public"."engagement"("res_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurrence_rule_eventId_key" ON "public"."recurrence_rule"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_participant_eventId_userId_key" ON "public"."event_participant"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "essay_submissions_essay_id_student_id_key" ON "public"."essay_submissions"("essay_id", "student_id");

-- CreateIndex
CREATE INDEX "support_ticket_student_id_idx" ON "public"."support_ticket"("student_id");

-- CreateIndex
CREATE INDEX "support_ticket_status_idx" ON "public"."support_ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_reply_ticket_id_idx" ON "public"."ticket_reply"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_reply_sender_id_idx" ON "public"."ticket_reply"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_uniqueCode_key" ON "public"."certificates"("uniqueCode");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_course_id_key" ON "public"."certificates"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "public"."user_badges"("user_id");

-- CreateIndex
CREATE INDEX "activity_log_userId_idx" ON "public"."activity_log"("userId");

-- CreateIndex
CREATE INDEX "activity_log_action_idx" ON "public"."activity_log"("action");

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "public"."activity_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_contents_lesson_id_key" ON "public"."lesson_contents"("lesson_id");

-- CreateIndex
CREATE INDEX "user_course_progress_user_id_idx" ON "public"."user_course_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_course_progress_course_id_idx" ON "public"."user_course_progress"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_course_progress_user_id_course_id_key" ON "public"."user_course_progress"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurrence_exception_eventId_occurrence_date_key" ON "public"."recurrence_exception"("eventId", "occurrence_date");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "public"."refresh_token"("userId");

-- CreateIndex
CREATE INDEX "refresh_token_tokenHash_idx" ON "public"."refresh_token"("tokenHash");

-- CreateIndex
CREATE INDEX "user_module_access_user_id_status_idx" ON "public"."user_module_access"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_module_access_user_id_idx" ON "public"."user_module_access"("user_id");

-- CreateIndex
CREATE INDEX "user_module_access_course_id_idx" ON "public"."user_module_access"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_order_id_key" ON "public"."subscriptions"("order_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "public"."subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_order_id_idx" ON "public"."subscriptions"("order_id");

-- CreateIndex
CREATE INDEX "credit_usages_user_id_idx" ON "public"."credit_usages"("user_id");

-- CreateIndex
CREATE INDEX "credit_usages_unlock_type_unlock_id_idx" ON "public"."credit_usages"("unlock_type", "unlock_id");

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "public"."catalogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_instructors" ADD CONSTRAINT "course_instructors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_instructors" ADD CONSTRAINT "course_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."course_admins" ADD CONSTRAINT "course_admins_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_admins" ADD CONSTRAINT "course_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalog_courses" ADD CONSTRAINT "catalog_courses_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."catalog_courses" ADD CONSTRAINT "catalog_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_catalog_access" ADD CONSTRAINT "user_catalog_access_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_catalog_access" ADD CONSTRAINT "user_catalog_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_course_access" ADD CONSTRAINT "user_course_access_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_course_access" ADD CONSTRAINT "user_course_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource" ADD CONSTRAINT "resource_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource" ADD CONSTRAINT "resource_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_module_progress" ADD CONSTRAINT "user_module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_module_progress" ADD CONSTRAINT "user_module_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_question_responses" ADD CONSTRAINT "quiz_question_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."user_quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_question_responses" ADD CONSTRAINT "quiz_question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chatbot_questions" ADD CONSTRAINT "chatbot_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chatbot_questions" ADD CONSTRAINT "chatbot_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chatbot_questions" ADD CONSTRAINT "chatbot_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."chatbot_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_submission" ADD CONSTRAINT "assignment_submission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_submission" ADD CONSTRAINT "assignment_submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_member" ADD CONSTRAINT "group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_member" ADD CONSTRAINT "group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_post" ADD CONSTRAINT "group_post_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_post" ADD CONSTRAINT "group_post_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."like" ADD CONSTRAINT "like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."like" ADD CONSTRAINT "like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_message" ADD CONSTRAINT "group_message_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_message" ADD CONSTRAINT "group_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debates" ADD CONSTRAINT "debates_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_response" ADD CONSTRAINT "debate_response_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "public"."debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_response" ADD CONSTRAINT "debate_response_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_participants" ADD CONSTRAINT "debate_participants_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "public"."debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_participants" ADD CONSTRAINT "debate_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."engagement" ADD CONSTRAINT "engagement_res_id_fkey" FOREIGN KEY ("res_id") REFERENCES "public"."debate_response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."engagement" ADD CONSTRAINT "engagement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event" ADD CONSTRAINT "event_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event" ADD CONSTRAINT "event_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event" ADD CONSTRAINT "event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurrence_rule" ADD CONSTRAINT "recurrence_rule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participant" ADD CONSTRAINT "event_participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participant" ADD CONSTRAINT "event_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder" ADD CONSTRAINT "reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder" ADD CONSTRAINT "reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."essays" ADD CONSTRAINT "essays_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."essay_submissions" ADD CONSTRAINT "essay_submissions_essay_id_fkey" FOREIGN KEY ("essay_id") REFERENCES "public"."essays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."essay_submissions" ADD CONSTRAINT "essay_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket" ADD CONSTRAINT "support_ticket_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_reply" ADD CONSTRAINT "ticket_reply_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_reply" ADD CONSTRAINT "ticket_reply_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_contents" ADD CONSTRAINT "lesson_contents_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_course_progress" ADD CONSTRAINT "user_course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_course_progress" ADD CONSTRAINT "user_course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurrence_exception" ADD CONSTRAINT "recurrence_exception_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."asset_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_category" ADD CONSTRAINT "asset_category_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_module_access" ADD CONSTRAINT "user_module_access_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_module_access" ADD CONSTRAINT "user_module_access_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_module_access" ADD CONSTRAINT "user_module_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_usages" ADD CONSTRAINT "credit_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

