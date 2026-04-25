/**
 * Arena live voice — serial utterance queue (coach STT finals).
 *
 * POLICY (coach-app live-training only)
 * --------------------------------------
 * - One interpretation pipeline run at a time (`finalizeLock` in the hook). Any new **final**
 *   segment that arrives while the lock is held is **appended here** — never dropped at the door.
 * - Jobs are processed **FIFO** after the current run finishes and the system is not in:
 *   ingest clarification voice flow, parser clarification follow-up, or outbox flush (those paths
 *   keep priority; backlog waits).
 * - **Capacity**: if the queue exceeds {@link ARENA_LIVE_UTTERANCE_QUEUE_CAP}, the **oldest**
 *   jobs are dropped first. This is acceptable only for coach chatter overflow under sustained
 *   load; the **newest** phrase is always kept. If you need zero drops, raise the cap — it is a
 *   safety valve, not product semantics.
 * - **Interim / partial STT** is not queued — only finals the hook forwards as jobs.
 *
 * Cross-cutting behavior lives in `useArenaVoiceAssistant`:
 * - **While interpreting** (finalize lock / `interpreting`): a new **final** segment is **enqueued**,
 *   not executed in parallel — no races with phase/listen/clarify/flush.
 * - **Ingest voice clarification** or **parser follow-up mic**: backlog **waits** (enqueue only);
 *   drain runs again when that flow ends or after outbox flush.
 * - **Outbox flush in flight**: drain is skipped until `notifyOutboxFlushFinished`.
 */

export type ArenaLiveUtterancePipelineEntry = "wake_listen" | "idle_continuous_final";

export type ArenaLiveUtteranceJob = {
  text: string;
  pipelineEntry: ArenaLiveUtterancePipelineEntry;
  enqueuedAt: number;
};

export const ARENA_LIVE_UTTERANCE_QUEUE_CAP = 20;

export type ArenaLiveUtteranceQueuePushResult = {
  queue: ArenaLiveUtteranceJob[];
  droppedCount: number;
};

export function arenaLiveUtteranceQueuePush(
  queue: ArenaLiveUtteranceJob[],
  job: ArenaLiveUtteranceJob
): ArenaLiveUtteranceQueuePushResult {
  const next = queue.concat(job);
  if (next.length <= ARENA_LIVE_UTTERANCE_QUEUE_CAP) {
    return { queue: next, droppedCount: 0 };
  }
  const overflow = next.length - ARENA_LIVE_UTTERANCE_QUEUE_CAP;
  return { queue: next.slice(overflow), droppedCount: overflow };
}
