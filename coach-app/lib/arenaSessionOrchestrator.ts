/**
 * Arena Session Orchestrator — PHASE 1 coarse phases + PHASE 2 lifecycle glue.
 *
 * GROUNDING CONTRACT
 * --------------------
 * The orchestrator never invents session events. Every transition must be triggered by
 * an explicit call from the live hook (mic/STT lifecycle, NLP pipeline boundaries,
 * clarification UI, TTS prompts, or session arm/disarm). It does not parse transcripts
 * and does not infer gameplay facts — interpretation stays in deterministic parser helpers
 * invoked by the hook; this class only sequences phases those helpers surface.
 *
 * PHASE 2: final coach utterances on the continuous idle mic may enter the same
 * interpretation pipeline as wake-driven capture; orchestration stays explicit (no
 * hidden “agent” reasoning).
 */

export type ArenaOrchestratorPhase =
  | "idle"
  | "warming"
  | "listening"
  | "interpreting"
  | "clarifying"
  | "prompting"
  | "flushing"
  | "completed";

export type ArenaSttSurfaceMode =
  | "continuous_idle"
  | "wake_command"
  | "parser_clarify"
  | "ingest_clarify";

export class ArenaSessionOrchestrator {
  private phase: ArenaOrchestratorPhase = "idle";

  constructor(private readonly onPhaseChange?: (phase: ArenaOrchestratorPhase) => void) {}

  getPhase(): ArenaOrchestratorPhase {
    return this.phase;
  }

  private setPhase(next: ArenaOrchestratorPhase): void {
    this.phase = next;
    this.onPhaseChange?.(next);
  }

  reset(): void {
    this.setPhase("idle");
  }

  notifySessionLiveArmed(): void {
    this.setPhase("idle");
  }

  notifySessionDisarmed(): void {
    this.setPhase("idle");
  }

  notifyWarmingStarted(): void {
    this.setPhase("warming");
  }

  notifyWarmingFinished(): void {
    if (this.phase === "warming") this.setPhase("idle");
  }

  /** Native STT is actively capturing for Arena (any command / idle / clarify window). */
  notifySttListeningStarted(_mode: ArenaSttSurfaceMode): void {
    void _mode;
    this.setPhase("listening");
  }

  notifyInterpretationPipelineStarted(): void {
    this.setPhase("interpreting");
  }

  /**
   * End of command interpretation. `clarifying` = parser asked follow-up (mic may reopen next);
   * `prompting` = about to play ingest clarification TTS; `idle` = return to baseline.
   */
  notifyInterpretationPipelineFinished(next: "idle" | "clarifying" | "prompting"): void {
    if (next === "clarifying") this.setPhase("clarifying");
    else if (next === "prompting") this.setPhase("prompting");
    else this.setPhase("idle");
  }

  notifyIngestClarifyTtsStarted(): void {
    this.setPhase("prompting");
  }

  /** After ingest TTS, before ingest answer mic opens (still idle surface until STT starts). */
  notifyIngestClarifyTtsEnded(): void {
    if (this.phase === "prompting") this.setPhase("idle");
  }

  notifyFlushingStarted(): void {
    this.setPhase("flushing");
  }

  notifyFlushingFinished(): void {
    if (this.phase === "flushing") this.setPhase("idle");
  }

  notifySessionCompleted(): void {
    this.setPhase("completed");
  }
}
