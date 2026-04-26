import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Delete all auth-related cookies
  response.cookies.delete("tcid_session");
  response.cookies.delete("tcid_token");
  response.cookies.delete("microsoft_token");

  return response;
}
