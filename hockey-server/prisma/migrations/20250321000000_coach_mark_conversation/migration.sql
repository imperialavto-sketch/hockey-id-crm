-- CreateTable
CREATE TABLE "CoachMarkConversation" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachMarkConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMarkMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMarkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachMarkConversation_parentId_key" ON "CoachMarkConversation"("parentId");

-- AddForeignKey
ALTER TABLE "CoachMarkConversation" ADD CONSTRAINT "CoachMarkConversation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMarkMessage" ADD CONSTRAINT "CoachMarkMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CoachMarkConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
