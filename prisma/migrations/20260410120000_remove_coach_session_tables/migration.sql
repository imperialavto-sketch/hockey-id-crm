-- Remove legacy parallel CoachSession contour (API retired 410; models dropped from schema).
-- Drop children first (FK -> CoachSession).

DROP TABLE IF EXISTS "CoachSessionParentDraft";
DROP TABLE IF EXISTS "CoachSessionPlayerSnapshot";
DROP TABLE IF EXISTS "CoachSessionObservation";
DROP TABLE IF EXISTS "CoachSession";
