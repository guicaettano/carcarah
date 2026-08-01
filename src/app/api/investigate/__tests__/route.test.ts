import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

describe("POST /api/investigate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a healthy query before checking agent configuration", async () => {
    const request = new Request("http://localhost/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "camiseta branca masculina" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ code: "NOT_REVENUE_LEAK" });
  });

  it("rejects an invalid request body", async () => {
    const request = new Request("http://localhost/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("reports missing agent configuration without faking a result", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const request = new Request("http://localhost/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "moletom canguru preto" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      code: "AGENT_NOT_CONFIGURED",
      error: "Agent runtime requires OPENAI_API_KEY.",
    });
    expect(body).not.toHaveProperty("investigation");
  });
});
