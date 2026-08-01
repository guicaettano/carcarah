import { NextResponse } from "next/server";

import { products, searchEvents } from "../../../lib/demo-data";
import {
  SearchActionAuthorizationError,
  SearchActionRiskError,
  executeApprovedSearchAction,
  resolveRequestSchema,
  revertApprovedSearchAction,
} from "../../../lib/search-actions";
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

  const parsed = resolveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "INVALID_ACTION",
        error: "A valid, previously investigated search action is required.",
      },
      { status: 400 },
    );
  }

  const { operation, query, proposal, approvalToken, ruleId } = parsed.data;
  const leak = detectRevenueLeaks(searchEvents, products).find(
    (item) => item.query === query,
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

  try {
    if (operation === "revert") {
      if (!ruleId) {
        return NextResponse.json(
          { code: "INVALID_ACTION", error: "A sandbox rule ID is required." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        revertApprovedSearchAction({
          query: leak.query,
          proposal,
          approvalToken,
          ruleId,
        }),
      );
    }

    return NextResponse.json(
      executeApprovedSearchAction({
        query: leak.query,
        proposal,
        approvalToken,
      }),
    );
  } catch (error) {
    if (error instanceof SearchActionRiskError) {
      return NextResponse.json(
        { code: "HIGH_RISK_ACTION", error: error.message },
        { status: 403 },
      );
    }
    if (error instanceof SearchActionAuthorizationError) {
      return NextResponse.json(
        { code: "ACTION_NOT_AUTHORIZED", error: error.message },
        { status: 403 },
      );
    }

    console.error("Carcarah sandbox resolution failed", error);
    return NextResponse.json(
      {
        code: "ACTION_REJECTED",
        error:
          error instanceof Error
            ? error.message
            : "The sandbox action could not be completed.",
      },
      { status: 400 },
    );
  }
}
