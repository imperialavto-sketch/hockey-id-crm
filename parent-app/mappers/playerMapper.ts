import type { Player } from "@/types";

export interface ApiPlayer {
  id: string;
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  age?: number;
  position?: string;
  number?: number;
  team?: string;
  parentName?: string;
  status?: string;
}

export function mapApiPlayerToPlayer(api: ApiPlayer): Player {
  const firstName = api.firstName ?? "";
  const lastName = api.lastName ?? "";
  const name = `${firstName} ${lastName}`.trim() || "Игрок";
  const birthYear = api.birthYear ?? new Date().getFullYear();
  const age = api.age ?? new Date().getFullYear() - birthYear;

  return {
    id: api.id,
    name,
    age,
    birthYear,
    team: api.team ?? "",
    position: api.position ?? "",
    number: api.number ?? 0,
    parentName: api.parentName ?? "",
    status: api.status ?? "active",
  };
}
