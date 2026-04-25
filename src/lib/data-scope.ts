/**
 * Data Scoping — второй уровень защиты: RBAC + владение данными.
 * Ограничивает доступ к данным по принадлежности (школа, команда, родитель).
 */

import type { PrismaClient } from "@prisma/client";
import type { NextResponse } from "next/server";
import type { ApiUser } from "./api-auth";
import { forbiddenResponse } from "./api-auth";

/** Минимальные поля игрока для проверки доступа */
export interface PlayerLike {
  id: string;
  teamId: string | null;
  parentId?: string | null;
  /** Для SCHOOL_MANAGER — нужна для проверки schoolId */
  team?: { schoolId: string } | null;
}

/** Минимальные поля команды для проверки доступа */
export interface TeamLike {
  id: string;
  schoolId: string;
}

/** Минимальные поля тренировки для проверки доступа */
export interface TrainingLike {
  id: string;
  teamId: string;
  /** Для SCHOOL_MANAGER — нужна для проверки schoolId */
  team?: { schoolId: string } | null;
}

/**
 * Может ли пользователь получить доступ к игроку.
 */
export function canAccessPlayer(
  user: ApiUser,
  player: PlayerLike
): boolean {
  switch (user.role) {
    case "SCHOOL_ADMIN":
      return true;
    case "SCHOOL_MANAGER":
      if (!user.schoolId) return false;
      if (!player.teamId) return false;
      return !!(player.team && player.team.schoolId === user.schoolId);
    case "MAIN_COACH":
    case "COACH":
      return !!user.teamId && player.teamId === user.teamId;
    case "PARENT":
      return !!user.parentId && player.parentId === user.parentId;
    default:
      return false;
  }
}

/**
 * Может ли пользователь получить доступ к команде.
 */
export function canAccessTeam(
  user: ApiUser,
  team: TeamLike
): boolean {
  switch (user.role) {
    case "SCHOOL_ADMIN":
      return true;
    case "SCHOOL_MANAGER":
      return !!user.schoolId && team.schoolId === user.schoolId;
    case "MAIN_COACH":
    case "COACH":
      return !!user.teamId && team.id === user.teamId;
    case "PARENT":
      return false;
    default:
      return false;
  }
}

/**
 * Может ли пользователь получить доступ к тренировке.
 */
export function canAccessTraining(
  user: ApiUser,
  training: TrainingLike
): boolean {
  switch (user.role) {
    case "SCHOOL_ADMIN":
      return true;
    case "SCHOOL_MANAGER":
      if (!user.schoolId) return false;
      return !!(training.team && training.team.schoolId === user.schoolId);
    case "MAIN_COACH":
    case "COACH":
      return !!user.teamId && training.teamId === user.teamId;
    case "PARENT":
      return false;
    default:
      return false;
  }
}

/**
 * Возвращает список ID игроков, доступных пользователю.
 * null = доступ ко всем (SCHOOL_ADMIN).
 */
export async function getAccessiblePlayerIds(
  user: ApiUser,
  prisma: PrismaClient
): Promise<string[] | null> {
  switch (user.role) {
    case "SCHOOL_ADMIN":
      return null;
    case "SCHOOL_MANAGER":
      if (!user.schoolId) return [];
      const schoolPlayers = await prisma.player.findMany({
        where: { team: { schoolId: user.schoolId } },
        select: { id: true },
      });
      return schoolPlayers.map((p: { id: string }) => p.id);
    case "MAIN_COACH":
    case "COACH":
      if (!user.teamId) return [];
      const teamPlayers = await prisma.player.findMany({
        where: { teamId: user.teamId },
        select: { id: true },
      });
      return teamPlayers.map((p: { id: string }) => p.id);
    case "PARENT":
      if (!user.parentId) return [];
      const childPlayers = await prisma.player.findMany({
        where: {
          OR: [
            { parentId: user.parentId },
            { parentPlayers: { some: { parentId: user.parentId } } },
          ],
        },
        select: { id: true },
      });
      return childPlayers.map((p: { id: string }) => p.id);
    default:
      return [];
  }
}

/**
 * Возвращает список ID команд, доступных пользователю.
 * null = доступ ко всем (SCHOOL_ADMIN).
 */
export async function getAccessibleTeamIds(
  user: ApiUser,
  prisma: PrismaClient
): Promise<string[] | null> {
  switch (user.role) {
    case "SCHOOL_ADMIN":
      return null;
    case "SCHOOL_MANAGER":
      if (!user.schoolId) return [];
      const schoolTeams = await prisma.team.findMany({
        where: { schoolId: user.schoolId },
        select: { id: true },
      });
      return schoolTeams.map((t: { id: string }) => t.id);
    case "MAIN_COACH":
    case "COACH":
      if (!user.teamId) return [];
      return [user.teamId];
    case "PARENT":
      return [];
    default:
      return [];
  }
}

/** Player with team for SCHOOL_MANAGER check */
export interface PlayerWithTeam extends PlayerLike {
  team?: { schoolId: string } | null;
}

/**
 * Проверяет доступ к игроку. Для SCHOOL_MANAGER нужен player.team.
 * Возвращает null если доступ есть, иначе NextResponse 403.
 */
export function checkPlayerAccess(
  user: ApiUser,
  player: PlayerWithTeam
): NextResponse | null {
  if (canAccessPlayer(user, player)) return null;
  return forbiddenResponse("Нет доступа к данному игроку");
}
