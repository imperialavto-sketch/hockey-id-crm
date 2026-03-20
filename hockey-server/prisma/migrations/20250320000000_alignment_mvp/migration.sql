-- AlterTable: Parent - add phone, firstName, lastName if missing; make email and password nullable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Parent' AND column_name = 'phone') THEN
    ALTER TABLE "Parent" ADD COLUMN "phone" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Parent' AND column_name = 'firstName') THEN
    ALTER TABLE "Parent" ADD COLUMN "firstName" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Parent' AND column_name = 'lastName') THEN
    ALTER TABLE "Parent" ADD COLUMN "lastName" TEXT;
  END IF;
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Parent' AND column_name = 'email') = 'NO' THEN
    ALTER TABLE "Parent" ALTER COLUMN "email" DROP NOT NULL;
  END IF;
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Parent' AND column_name = 'password') = 'NO' THEN
    ALTER TABLE "Parent" ALTER COLUMN "password" DROP NOT NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_phone_key" ON "Parent"("phone") WHERE "phone" IS NOT NULL;

-- CreateTable: ParentAuthCode
CREATE TABLE IF NOT EXISTS "ParentAuthCode" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentId" INTEGER,

    CONSTRAINT "ParentAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoachProfile
CREATE TABLE IF NOT EXISTS "CoachProfile" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bio" TEXT,
    "specialization" TEXT,
    "specialties" JSONB,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "priceFrom" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CoachProfile_slug_key" ON "CoachProfile"("slug");

-- CreateTable: CoachService
CREATE TABLE IF NOT EXISTS "CoachService" (
    "id" SERIAL NOT NULL,
    "coachId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "price" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachService_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoachSlot
CREATE TABLE IF NOT EXISTS "CoachSlot" (
    "id" SERIAL NOT NULL,
    "coachId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookingRequest
CREATE TABLE IF NOT EXISTS "BookingRequest" (
    "id" SERIAL NOT NULL,
    "coachId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "parentName" TEXT,
    "parentPhone" TEXT,
    "playerId" INTEGER,
    "message" TEXT,
    "preferredDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_parentId_key" ON "Subscription"("parentId");

-- CreateTable: SubscriptionBillingRecord
CREATE TABLE IF NOT EXISTS "SubscriptionBillingRecord" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionBillingRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParentAuthCode" ADD CONSTRAINT "ParentAuthCode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachService" ADD CONSTRAINT "CoachService_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSlot" ADD CONSTRAINT "CoachSlot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionBillingRecord" ADD CONSTRAINT "SubscriptionBillingRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionBillingRecord" ADD CONSTRAINT "SubscriptionBillingRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
