import type { ScheduleItem } from "@/types";

export interface ApiScheduleItem {
  id: string;
  day?: string;
  title?: string;
  time?: string;
}

export function mapApiScheduleItem(item: ApiScheduleItem): ScheduleItem {
  return {
    id: item.id,
    day: item.day ?? "",
    title: item.title ?? "",
    time: item.time ?? "—",
  };
}
