/**
 * Deterministic RU copy for session-context group attribution diagnostics only.
 * Not team planned-vs-observed; not strict group truth.
 */
import type {
  LiveTrainingSessionGroupContextCoverageKind,
  LiveTrainingSessionGroupContextStampConsistencyKind,
} from "@/types/liveTraining";

export function ruGroupSessionContextCoverageLabel(
  kind: LiveTrainingSessionGroupContextCoverageKind
): string {
  switch (kind) {
    case "no_signals":
      return "Нет сигналов";
    case "all_legacy":
      return "Есть legacy-сигналы без атрибуции";
    case "mixed":
      return "Смешанно: с атрибуцией и legacy";
    case "fully_attributed":
      return "Полностью с атрибуцией контекста";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ruGroupSessionContextConsistencyLabel(
  kind: LiveTrainingSessionGroupContextStampConsistencyKind
): string {
  switch (kind) {
    case "no_signals":
      return "Нет сигналов";
    case "no_attributed_signals":
      return "Нет сигналов с атрибуцией контекста";
    case "canonical_present_but_unstamped_only":
      return "Контекст задан, сигналы без штампа атрибуции";
    case "aligned":
      return "Совпадает";
    case "mixed_stamps":
      return "Несколько разных штампов";
    case "canonical_null_but_stamped":
      return "Штамп без канонического контекста группы";
    case "mismatch":
      return "Расхождение канона и штампа";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
