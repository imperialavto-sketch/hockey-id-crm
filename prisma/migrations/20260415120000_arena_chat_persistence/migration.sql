-- Arena Chat: server-side persistence for parent AI thread (separate from ChatConversation).

CREATE TABLE "ArenaChatConversation" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaChatConversation_parentId_key" ON "ArenaChatConversation"("parentId");

CREATE INDEX "ArenaChatConversation_parentId_idx" ON "ArenaChatConversation"("parentId");

CREATE INDEX "ArenaChatMessage_conversationId_idx" ON "ArenaChatMessage"("conversationId");

CREATE INDEX "ArenaChatMessage_conversationId_createdAt_idx" ON "ArenaChatMessage"("conversationId", "createdAt");

ALTER TABLE "ArenaChatConversation" ADD CONSTRAINT "ArenaChatConversation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArenaChatMessage" ADD CONSTRAINT "ArenaChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ArenaChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
