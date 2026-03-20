/**
 * Coach Mark Calendar Export v1.
 * Генерация shareable text и .ics для экспорта в календарь.
 */

import type { CoachMarkCalendarItem } from "./coachMarkStorage";

const DAY_TO_WEEKDAY: Record<string, number> = {
  Понедельник: 1,
  Вторник: 2,
  Среда: 3,
  Четверг: 4,
  Пятница: 5,
  Суббота: 6,
  Воскресенье: 7,
};

/** Получить дату ближайшего дня недели */
function getNextDateForDay(dayName: string): Date {
  const targetDow = DAY_TO_WEEKDAY[dayName] ?? 1;
  const now = new Date();
  const currentDow = now.getDay() || 7; // воскресенье = 7
  let daysToAdd = targetDow - currentDow;
  if (daysToAdd <= 0) daysToAdd += 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysToAdd);
  return d;
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Shareable text — удобно скопировать и вручную добавить в календарь */
export function generateCoachMarkCalendarShareText(
  items: CoachMarkCalendarItem[]
): string {
  if (items.length === 0) return "";

  const lines: string[] = [
    "План недели — Coach Mark",
    "",
    "Скопируйте и добавьте в календарь:",
    "",
  ];

  for (const it of items) {
    const time = it.suggestedTime ?? "—";
    const dur = it.durationMinutes ? `${it.durationMinutes} мин` : "";
    lines.push(`${it.day}, ${time}${dur ? ` · ${dur}` : ""}`);
    lines.push(it.title);
    if (it.details) lines.push(it.details);
    lines.push("");
  }

  return lines.join("\n").trim();
}

/** Генерация .ics файла */
export function generateCoachMarkICS(
  items: CoachMarkCalendarItem[],
  title = "Coach Mark — План недели"
): string {
  const now = new Date();
  const uid = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}@coachmark`;

  const events: string[] = [];

  for (const it of items) {
    const startDate = getNextDateForDay(it.day);
    const [hh = "09", mm = "00"] = (it.suggestedTime ?? "09:00").split(":");
    startDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (it.durationMinutes ?? 45));

    const dtStart = formatICSDate(startDate);
    const dtEnd = formatICSDate(endDate);
    const summary = escapeICS(it.title);
    const description = it.details ? escapeICS(it.details) : "";

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${uid()}`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        description ? `DESCRIPTION:${description}` : "",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n")
    );
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Mark//Hockey ID//RU",
    `X-WR-CALNAME:${escapeICS(title)}`,
    events.join("\r\n"),
    "END:VCALENDAR",
  ].join("\r\n");
}
