import { canParentAccessTeam } from "@/lib/parent-access";

export async function parentsShareTeam(
  parentIdA: string,
  parentIdB: string,
  teamId: string
): Promise<boolean> {
  const [a, b] = await Promise.all([
    canParentAccessTeam(parentIdA, teamId),
    canParentAccessTeam(parentIdB, teamId),
  ]);
  return a && b;
}
