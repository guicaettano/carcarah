import { describe, expect, it } from "vitest";

import { buildAgentActivity } from "../activity";
import type { InvestigationTraceEvent } from "../types";

describe("agent activity presentation", () => {
  it("does not create activity without trace events", () => {
    expect(buildAgentActivity([])).toEqual([]);
  });

  it("preserves real tool order, summaries and generic catalog terms", () => {
    const trace: InvestigationTraceEvent[] = [
      {
        tool: "getLeakContext",
        input: { query: "tênis corrida azul" },
        summary: "Contexto verificado com 91 buscas.",
      },
      {
        tool: "searchCatalog",
        input: { searchTerms: ["tênis azul", "calçado de corrida"] },
        summary: "Catálogo pesquisado com dois termos.",
      },
    ];

    expect(buildAgentActivity(trace)).toEqual([
      {
        tool: "getLeakContext",
        label: "Contexto da oportunidade",
        summary: "Contexto verificado com 91 buscas.",
        terms: [],
      },
      {
        tool: "searchCatalog",
        label: "Catálogo investigado",
        summary: "Catálogo pesquisado com dois termos.",
        terms: ["tênis azul", "calçado de corrida"],
      },
    ]);
  });
});
