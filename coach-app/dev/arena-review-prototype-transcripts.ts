/**
 * Примеры транскриптов для локального Arena review pipeline:
 * — /dev/arena-review-prototype
 */

export type ArenaReviewPrototypeTranscriptSample = {
  id: string;
  /** Короткая подпись для chip */
  label: string;
  transcript: string;
};

export const ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS: ArenaReviewPrototypeTranscriptSample[] = [
  {
    id: "t1",
    label: "17 / 23 контраст",
    transcript: "17-й хорошо, а 23-й потерял игрока",
  },
  {
    id: "t2",
    label: "Команда + но",
    transcript: "команда хорошо, но концовка слабая",
  },
  {
    id: "t3",
    label: "Марк ; Гротов",
    transcript: "Марк хорошо открылся; Гротов поздно сел",
  },
  {
    id: "t4",
    label: "Марк, 93-й",
    transcript: "Марк, 93-й, хорошо",
  },
  {
    id: "t5",
    label: "17 и 23 пара",
    transcript: "17-й и 23-й не успели вернуться",
  },
  {
    id: "t6",
    label: "Дубль игрок merge",
    transcript: "Марк отлично в зоне, 93-й ошибся на сине",
  },
  {
    id: "t7",
    label: "Один игрок",
    transcript: "Марк поздно сел в колени",
  },
  {
    id: "t8",
    label: "Unknown",
    transcript: "запиши момент",
  },
];
