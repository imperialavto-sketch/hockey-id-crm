-- Parent channel read state for team announcements (TeamFeedPost feed)
CREATE TABLE "ParentTeamAnnouncementRead" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentTeamAnnouncementRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentTeamAnnouncementRead_parentId_teamId_key" ON "ParentTeamAnnouncementRead"("parentId", "teamId");

ALTER TABLE "ParentTeamAnnouncementRead" ADD CONSTRAINT "ParentTeamAnnouncementRead_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentTeamAnnouncementRead" ADD CONSTRAINT "ParentTeamAnnouncementRead_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
