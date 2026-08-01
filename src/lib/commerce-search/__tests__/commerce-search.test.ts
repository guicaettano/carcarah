import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  searchCatalogByTerms,
  searchStorefront,
} from "..";

describe("storefront search simulator", () => {
  it("does not find relevant results for the vocabulary-mismatched query", () => {
    const result = searchStorefront("moletom canguru preto");

    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("finds the expected products for hoodie preto", () => {
    const result = searchStorefront("hoodie preto");

    expect(result.total).toBeGreaterThan(0);
    expect(result.results.map((product) => product.id)).toEqual(
      expect.arrayContaining(["prod_001", "prod_003"]),
    );
  });

  it("keeps catalog search generic without a planted synonym mapping", () => {
    const source = readFileSync(
      new URL("../index.ts", import.meta.url),
      "utf8",
    );
    const hoodieMatches = searchCatalogByTerms(["hoodie preto"]);
    const missingMatches = searchCatalogByTerms(["termo inexistente xyz"]);

    expect(source.toLowerCase()).not.toContain("canguru");
    expect(hoodieMatches.map((match) => match.product.id)).toEqual(
      expect.arrayContaining(["prod_001", "prod_003"]),
    );
    expect(missingMatches).toEqual([]);
  });
});
