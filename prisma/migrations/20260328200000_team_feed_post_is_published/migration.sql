-- Soft visibility for team feed / announcements (parent channel hides unpublished)
ALTER TABLE "TeamFeedPost" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
