-- Drop legacy parent AI chat tables (persistence lives on Next.js CRM / Arena).
DROP TABLE IF EXISTS "CoachMarkMessage";
DROP TABLE IF EXISTS "CoachMarkConversation";
