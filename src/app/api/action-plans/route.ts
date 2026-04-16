import { NextResponse } from "next/server";
import { getActionPlans } from "@/lib/action-plans";

export async function GET() {
  try {
    const actions = await getActionPlans();

    return NextResponse.json({ actions });
  } catch (error) {
    console.error("Action Plans API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
