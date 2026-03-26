import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    posts: [],
    emptyState: "no_posts",
  });
}
