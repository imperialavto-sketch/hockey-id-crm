-- PHASE 22: компактный снимок contextAssistant на момент ingest (review provenance).
ALTER TABLE "LiveTrainingObservationDraft" ADD COLUMN "ingestProvenanceJson" JSONB;
