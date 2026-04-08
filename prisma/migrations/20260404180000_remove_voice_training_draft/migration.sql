-- Remove slot voice-draft models (replaced by live-training behavioral suggestions).

DROP TABLE IF EXISTS "VoiceTrainingDraftObservation";
DROP TABLE IF EXISTS "VoiceTrainingDraftSession";

DROP TYPE IF EXISTS "VoiceTrainingDraftResolutionStatus";
DROP TYPE IF EXISTS "VoiceTrainingDraftSessionStatus";
