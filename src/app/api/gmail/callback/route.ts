import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(
      new URL("/dashboard?gmail=connected", request.url)
    );
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?gmail=error", request.url)
    );
  }
}
