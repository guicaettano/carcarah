import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { searchStorefront } from "../../commerce-search";
import { products, searchEvents } from "../../demo-data";
import {
  ACT_WRITE_TOOLS,
  applySearchRule,
  revertSearchRule,
} from "../tools/write-tools";
import { createEmptySearchConfiguration } from "../configuration";
import type { SearchActionProposal } from "../types";
import {
  selectRelatedHealthyQueries,
  validateSearchChange,
} from "../validation";

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

describe("search configuration sandbox", () => {
  it("keeps the original query behavior without configuration", () => {
    expect(searchStorefront(query).total).toBe(0);
  });

  it("changes storefront results only through an applied search rule", () => {
    const originalConfig = createEmptySearchConfiguration();
    const applied = applySearchRule(proposal, originalConfig);
    const result = searchStorefront(query, products, applied.config);

    expect(result.total).toBeGreaterThan(0);
    expect(result.results.map((product) => product.id)).toContain("prod_013");
    expect(JSON.stringify(applied.config)).not.toContain("prod_013");
    expect(
      result.results.every((product) =>
        products.some((catalogProduct) => catalogProduct.id === product.id),
      ),
    ).toBe(true);
  });

  it("reverts an applied rule and restores the original behavior", () => {
    const originalConfig = createEmptySearchConfiguration();
    const applied = applySearchRule(proposal, originalConfig);
    const reverted = revertSearchRule(applied.config, applied.change.ruleId);

    expect(reverted.config).toEqual(originalConfig);
    expect(searchStorefront(query, products, reverted.config).total).toBe(0);
  });

  it("validates a measurable improvement", () => {
    const originalConfig = createEmptySearchConfiguration();
    const applied = applySearchRule(proposal, originalConfig);
    const validation = validateSearchChange(
      query,
      proposal,
      originalConfig,
      applied.config,
    );

    expect(validation.before.resultCount).toBe(0);
    expect(validation.after.resultCount).toBeGreaterThan(0);
    expect(validation.newRelevantProducts).toContain("prod_013");
    expect(validation.validationPassed).toBe(true);
  });

  it("fails validation when the rule produces no improvement", () => {
    const noChangeProposal = { ...proposal, targets: ["larga"] };
    const originalConfig = createEmptySearchConfiguration();
    const applied = applySearchRule(noChangeProposal, originalConfig);
    const validation = validateSearchChange(
      query,
      noChangeProposal,
      originalConfig,
      applied.config,
    );

    expect(validation.after).toEqual(validation.before);
    expect(validation.validationPassed).toBe(false);
  });

  it("selects and runs related healthy-query regression checks", () => {
    const healthyQueries = selectRelatedHealthyQueries(
      query,
      proposal,
      products,
      searchEvents,
    );
    const originalConfig = createEmptySearchConfiguration();
    const applied = applySearchRule(proposal, originalConfig);
    const validation = validateSearchChange(
      query,
      proposal,
      originalConfig,
      applied.config,
    );

    expect(healthyQueries.length).toBeGreaterThan(0);
    expect(validation.regressionChecks.length).toBe(healthyQueries.length);
    expect(validation.regressionChecks.every((check) => !check.degraded)).toBe(
      true,
    );
  });

  it("exposes the write tool only from the Act boundary", () => {
    const investigationRuntime = readFileSync(
      new URL("../../investigation-agent/runtime.ts", import.meta.url),
      "utf8",
    );

    expect(Object.keys(ACT_WRITE_TOOLS)).toEqual(["applySearchRule"]);
    expect(investigationRuntime).not.toContain("ACT_WRITE_TOOLS");
    expect(investigationRuntime).not.toContain("applySearchRule");
  });
});
