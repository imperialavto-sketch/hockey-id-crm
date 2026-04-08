import { NextRequest } from "next/server";
import { handlePhoneAuthRequestCode } from "@/lib/auth/phoneAuthFlow";

export async function POST(req: NextRequest) {
  return handlePhoneAuthRequestCode(req);
}
