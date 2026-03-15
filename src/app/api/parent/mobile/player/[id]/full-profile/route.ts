import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("[full-profile] request started", new Date().toISOString());
  console.log("[full-profile] route name:", "parent/mobile/player/[id]/full-profile");
  console.log("[full-profile] player id:", id);

  return NextResponse.json({
    player: {
      id,
      firstName: "Марк",
      lastName: "Голыш",
      birthYear: 2014,
      age: 10,
      position: "Нападающий",
      number: 17,
      team: "Hockey ID Test Team",
      teamId: null,
      parentName: "",
      status: "active",
    },
    stats: { games: 18, goals: 12, assists: 9, points: 21, pim: 0 },
    schedule: [],
    recommendations: [],
    progressHistory: [],
    achievements: { unlocked: [], locked: [] },
    videoAnalyses: [],
  });
}
