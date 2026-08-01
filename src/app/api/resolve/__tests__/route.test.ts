import { afterEach, describe, expect, it, vi } from "vitest";

import { createSearchActionApproval } from "../../../../lib/search-actions";
import type { SearchActionProposal } from "../../../../lib/search-actions";
import { POST } from "../route";

const query = "jaqueta jeans larga";
const proposal: SearchActionProposal = {
  type: "synonym_rule",
  source: "larga",
  targets: ["oversized"],
  scope: "demo_storefront",
  confidence: 0.93,
  risk: "low",
  reversible: true,
  rationale: "The narrower catalog vocabulary was supported by inspection.",
};

function request(body: unknown) {
  return new Request("http://localhost/api/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/resolve", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a healthy query before trusting an action", async () => {
    const response = await POST(
      request({
        operation: "apply",
        query: "camiseta branca masculina",
        proposal,
        approvalToken: "not-a-valid-approval-token",
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "NOT_REVENUE_LEAK" });
  });

  it("rejects client-supplied financial metrics", async () => {
    const response = await POST(
      request({
        operation: "apply",
        query,
        proposal,
        approvalToken: "not-a-valid-approval-token",
        estimatedMonthlyOpportunity: 999_999,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_ACTION" });
  });

  it("applies a signed low-risk proposal and returns measured results", async () => {
    vi.stubEnv("CARCARAH_APPROVAL_SECRET", "test-approval-secret");
    const approval = createSearchActionApproval(
      query,
      proposal,
      ["oversized"],
      ["prod_013"],
    );
    const response = await POST(
      request({
        operation: "apply",
        query,
        proposal,
        approvalToken: approval.token,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.validation.before.resultCount).toBe(0);
    expect(body.validation.after.resultCount).toBeGreaterThan(0);
    expect(body.validation.validationPassed).toBe(true);
  });

  it("blocks a signed high-risk proposal", async () => {
    vi.stubEnv("CARCARAH_APPROVAL_SECRET", "test-approval-secret");
    const highRiskProposal: SearchActionProposal = {
      ...proposal,
      source: query,
      type: "query_rewrite",
      risk: "high",
    };
    const approval = createSearchActionApproval(
      query,
      highRiskProposal,
      ["oversized"],
      ["prod_013"],
    );
    const response = await POST(
      request({
        operation: "apply",
        query,
        proposal: highRiskProposal,
        approvalToken: approval.token,
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "HIGH_RISK_ACTION" });
  });
});
