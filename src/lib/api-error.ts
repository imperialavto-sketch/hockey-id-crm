import { NextResponse } from "next/server";

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      error: { code, message },
    },
    { status }
  );
}
