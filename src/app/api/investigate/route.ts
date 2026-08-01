import { NextResponse } from "next/server";

import {
  AgentRuntimeNotConfiguredError,
  investigateRevenueLeak,
} from "../../../lib/investigation-agent/runtime";
import { investigationInputSchema } from "../../../lib/investigation-agent/schema";
import { products, searchEvents } from "../../../lib/demo-data";
import { detectRevenueLeaks } from "../../../lib/search-analysis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsedInput = investigationInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", error: "A valid revenue leak query is required." },
      { status: 400 },
    );
  }

  const leak = detectRevenueLeaks(searchEvents, products).find(
    (item) => item.query === parsedInput.data.query,
  );
  if (!leak) {
    return NextResponse.json(
      {
        code: "NOT_REVENUE_LEAK",
        error: "The requested query is not a currently detected revenue leak.",
      },
      { status: 404 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        code: "AGENT_NOT_CONFIGURED",
        error: "Agent runtime requires OPENAI_API_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json(await investigateRevenueLeak(leak.query));
  } catch (error) {
    if (error instanceof AgentRuntimeNotConfiguredError) {
      return NextResponse.json(
        { code: "AGENT_NOT_CONFIGURED", error: error.message },
        { status: 503 },
      );
    }

    console.error("Carcarah investigation failed", error);
    return NextResponse.json(
      {
        code: "INVESTIGATION_FAILED",
        error: "The investigation could not be completed. Please try again.",
      },
      { status: 502 },
    );
  }
}
