import { NextResponse } from "next/server";

export async function GET() {
  console.log("[players] request started", new Date().toISOString());
  console.log("[players] route name:", "parent/mobile/players");

  return NextResponse.json([
    {
      id: "1",
      firstName: "Марк",
      lastName: "Голыш",
      birthYear: 2014,
      age: 10,
      position: "Нападающий",
      number: 17,
      team: "Hockey ID",
      parentName: "",
      status: "active",
    },
  ]);
}
