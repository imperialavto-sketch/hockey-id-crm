import type { Player } from "@/types";
import { PLAYER_MARK_GOLYSH, PLAYER_AGE } from "@/constants/mockPlayerMarkGolysh";

export const mockPlayers: Player[] = [
  {
    id: PLAYER_MARK_GOLYSH.id,
    name: PLAYER_MARK_GOLYSH.profile.fullName,
    age: PLAYER_AGE,
    birthYear: PLAYER_MARK_GOLYSH.profile.birthYear,
    team: PLAYER_MARK_GOLYSH.profile.team,
    position: "Нападающий",
    number: PLAYER_MARK_GOLYSH.profile.number,
    parentName: "Юрий Голыш",
    status: "active",
  },
];
