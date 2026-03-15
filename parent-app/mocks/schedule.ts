import type { ScheduleItem } from "@/types";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

const demoSchedule = PLAYER_MARK_GOLYSH.schedule
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((s) => ({
    id: String(s.id),
    day: formatDay(s.date),
    title: s.type === "game" ? `Игра: ${s.opponent}` : s.title,
    time: s.time,
  }));

export const mockPlayerSchedule: Record<string, ScheduleItem[]> = {
  [PLAYER_MARK_GOLYSH.id]: demoSchedule,
  "1": demoSchedule,
};

export const mockWeeklySchedule: ScheduleItem[] = demoSchedule.length > 0
  ? demoSchedule
  : [
      { id: "1", day: "Понедельник", title: "Лёд", time: "18:00" },
      { id: "2", day: "Вторник", title: "Выходной", time: "—" },
      { id: "3", day: "Среда", title: "ОФП", time: "17:30" },
      { id: "4", day: "Пятница", title: "Лёд", time: "19:00" },
      { id: "5", day: "Суббота", title: "Игра", time: "12:00" },
    ];
