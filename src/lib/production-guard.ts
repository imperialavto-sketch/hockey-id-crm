import { NextResponse } from "next/server";

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function areStubRoutesAllowed(): boolean {
  if (!isProductionRuntime()) return true;
  return process.env.ENABLE_PRODUCTION_STUB_ROUTES === "true";
}

export function featureDisabledResponse(feature: string): NextResponse {
  return NextResponse.json(
    {
      error: `${feature} is disabled in production`,
      code: "FEATURE_DISABLED",
    },
    { status: 503 }
  );
}
