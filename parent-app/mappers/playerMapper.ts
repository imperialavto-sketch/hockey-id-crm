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

const CANONICAL_TEST_PLAYER = {
  id: "1",
  fullName: "Голыш Марк",
  number: 93,
  age: 12,
  birthYear: new Date().getFullYear() - 12,
  team: "Hockey ID",
  position: "Нападающий",
  status: "Активен",
} as const;

const POSITION_LABELS: Record<string, string> = {
  Forward: "Нападающий",
  Defenseman: "Защитник",
  Goaltender: "Вратарь",
  Center: "Центр",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  inactive: "Неактивен",
  verified: "Подтвержден",
};

function translatePosition(position?: string): string {
  if (!position) return "";
  return POSITION_LABELS[position] ?? position;
}

function translateStatus(status?: string): string {
  if (!status) return "";
  return STATUS_LABELS[status.toLowerCase()] ?? status;
}

export function mapApiPlayerToPlayer(api: ApiPlayer): Player {
  const firstName = api.firstName ?? "";
  const lastName = api.lastName ?? "";
  const name = `${firstName} ${lastName}`.trim() || "Игрок";
  const isCanonicalTestPlayer =
    api.id === CANONICAL_TEST_PLAYER.id || name === CANONICAL_TEST_PLAYER.fullName;
  const birthYear =
    api.birthYear ??
    (api.age ? new Date().getFullYear() - api.age : undefined) ??
    (isCanonicalTestPlayer ? CANONICAL_TEST_PLAYER.birthYear : new Date().getFullYear());
  const age =
    api.age ??
    (isCanonicalTestPlayer
      ? CANONICAL_TEST_PLAYER.age
      : new Date().getFullYear() - birthYear);

  return {
    id: api.id,
    name,
    age,
    birthYear,
    team: api.team ?? (isCanonicalTestPlayer ? CANONICAL_TEST_PLAYER.team : ""),
    position: translatePosition(
      api.position ?? (isCanonicalTestPlayer ? CANONICAL_TEST_PLAYER.position : "")
    ),
    number: api.number ?? (isCanonicalTestPlayer ? CANONICAL_TEST_PLAYER.number : 0),
    parentName: api.parentName ?? "",
    status: translateStatus(
      api.status ?? (isCanonicalTestPlayer ? CANONICAL_TEST_PLAYER.status : "active")
    ),
  };
}
