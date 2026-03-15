export const MOCK_TIME_SLOTS = [
  { time: "09:00", available: false },
  { time: "10:00", available: true },
  { time: "11:00", available: false },
  { time: "12:00", available: true },
  { time: "13:00", available: false },
  { time: "13:30", available: true },
  { time: "14:00", available: false },
  { time: "15:00", available: true },
  { time: "16:00", available: false },
  { time: "17:00", available: false },
  { time: "18:00", available: true },
  { time: "19:00", available: true },
  { time: "20:00", available: false },
];

export const DURATION_OPTIONS = [
  { value: 60, label: "60 минут" },
  { value: 90, label: "90 минут" },
];

export const FORMAT_LABELS: Record<string, string> = {
  ice: "Лёд",
  gym: "Зал",
  online: "Онлайн разбор",
};
