-- STEP 18: каталог внешних тренеров для match-external-coaches (без связи с User).
CREATE TABLE "ExternalCoach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCoach_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalCoach_isActive_idx" ON "ExternalCoach"("isActive");
