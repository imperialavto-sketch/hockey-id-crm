-- Parent in-app notifications: chat + team announcements
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_ANNOUNCEMENT';

ALTER TABLE "Notification" ADD COLUMN "data" JSONB;
