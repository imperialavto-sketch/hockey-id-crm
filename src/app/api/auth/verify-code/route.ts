import { NextRequest } from "next/server";
import { handlePhoneAuthVerifyCode } from "@/lib/auth/phoneAuthFlow";

export async function POST(req: NextRequest) {
  return handlePhoneAuthVerifyCode(req);
}
