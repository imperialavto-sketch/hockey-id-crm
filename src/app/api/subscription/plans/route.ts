import { NextResponse } from "next/server";
import { getPlans } from "@/lib/subscriptionStub";

export async function GET() {
  const plans = getPlans();
  return NextResponse.json(plans);
}

