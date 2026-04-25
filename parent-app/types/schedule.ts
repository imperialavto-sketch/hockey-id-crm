export interface ScheduleItem {
  id: string;
  day: string;
  title: string;
  time: string;
  /** Место / подпись (TrainingSession location) */
  subtitle?: string;
  /** Посещаемость для TrainingSession (из API) */
  attendance?: string;
  /** ISO start/end when API provides machine times (hero / live status). */
  startAt?: string;
  endAt?: string;
}
