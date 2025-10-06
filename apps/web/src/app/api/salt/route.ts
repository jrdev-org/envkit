import { NextResponse } from "next/server";
import * as crypto from "crypto";
export async function GET() {
  return NextResponse.json({ salt: crypto.randomBytes(32).toString("hex") });
}
