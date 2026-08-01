import { describe, expect, it } from "vitest";

import { INVESTIGATION_WRITE_TOOLS } from "../tools/write-tools";
import type { InvestigationRuntimeState } from "../types";
import { validateAndGroundInvestigationResult } from "../validation";

function stateWithProduct(productId: string): InvestigationRuntimeState {
  return {
    trace: [
      { tool: "getLeakContext", input: {}, summary: "Metrics inspected." },
      { tool: "searchStorefront", input: {}, summary: "No results returned." },
      { tool: "searchCatalog", input: {}, summary: "Catalog searched." },
      { tool: "getProductDetails", input: {}, summary: "Product inspected." },
    ],
    catalogCandidateIds: new Set([productId]),
    inspectedProductIds: new Set([productId]),
    searchedTerms: new Set(["hoodie preto"]),
  };
}

describe("investigation result guardrails", () => {
  it("rejects product IDs that do not exist in the catalog", () => {
    const candidate = {
      query: "consulta sem produto",
      diagnosis: "A possible vocabulary mismatch was found.",
      rootCause: "vocabulary_mismatch",
      evidence: [{ type: "catalog_search", description: "Model claim." }],
      relatedProducts: [
        { id: "prod_unknown", name: "Invented", price: 1, stock: 1 },
      ],
      recommendation: {
        action: "no_action",
        sourceTerm: null,
        targetTerms: null,
      },
      actionProposal: null,
      confidence: 0.5,
      risk: "low",
    };

    expect(() =>
      validateAndGroundInvestigationResult(
        candidate,
        candidate.query,
        stateWithProduct("prod_unknown"),
      ),
    ).toThrow("Unknown catalog product");
  });

  it("replaces model evidence and product facts with observed data", () => {
    const state = stateWithProduct("prod_001");
    const candidate = {
      query: "casaco urbano preto",
      diagnosis: "The storefront and catalog use different vocabulary.",
      rootCause: "vocabulary_mismatch",
      evidence: [{ type: "catalog_search", description: "Invented evidence." }],
      relatedProducts: [
        { id: "prod_001", name: "Wrong name", price: 1, stock: 999 },
      ],
      recommendation: {
        action: "create_synonym",
        sourceTerm: "casaco",
        targetTerms: ["hoodie preto"],
      },
      actionProposal: {
        type: "synonym_rule",
        source: "casaco",
        targets: ["hoodie"],
        scope: "demo_storefront",
        confidence: 0.9,
        risk: "low",
        reversible: true,
        rationale: "A narrow vocabulary bridge is supported by inspected products.",
      },
      confidence: 0.9,
      risk: "low",
    };

    const result = validateAndGroundInvestigationResult(
      candidate,
      candidate.query,
      state,
    );

    expect(result.evidence.map((item) => item.description)).not.toContain(
      "Invented evidence.",
    );
    expect(result.relatedProducts[0]).toMatchObject({
      id: "prod_001",
      name: "Moletom Hoodie Preto Masculino",
      price: 199,
    });
  });

  it("does not expose write tools in the investigation milestone", () => {
    expect(Object.keys(INVESTIGATION_WRITE_TOOLS)).toEqual([]);
  });
});
