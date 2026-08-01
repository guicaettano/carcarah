import { normalizeSearchText } from "../commerce-search";
import { products } from "../demo-data";
import { investigationResultSchema } from "./schema";
import type {
  InvestigationResult,
  InvestigationRuntimeState,
  InvestigationTraceEvent,
  ReadToolName,
} from "./types";

const evidenceTypeByTool: Record<
  ReadToolName,
  InvestigationResult["evidence"][number]["type"]
> = {
  getLeakContext: "leak_metrics",
  searchStorefront: "storefront_results",
  searchCatalog: "catalog_search",
  getProductDetails: "product_details",
};

function requireToolCall(
  trace: InvestigationTraceEvent[],
  toolName: ReadToolName,
): void {
  if (!trace.some((event) => event.tool === toolName)) {
    throw new Error(`Investigation did not execute required tool: ${toolName}`);
  }
}

export function validateAndGroundInvestigationResult(
  candidate: unknown,
  query: string,
  state: InvestigationRuntimeState,
): InvestigationResult {
  const parsed = investigationResultSchema.parse(candidate);

  if (normalizeSearchText(parsed.query) !== normalizeSearchText(query)) {
    throw new Error("Investigation result query does not match the request.");
  }

  requireToolCall(state.trace, "getLeakContext");
  requireToolCall(state.trace, "searchStorefront");
  requireToolCall(state.trace, "searchCatalog");

  const relatedProducts = parsed.relatedProducts.map((relatedProduct) => {
    const catalogProduct = products.find(
      (product) => product.id === relatedProduct.id,
    );
    if (!catalogProduct) {
      throw new Error(`Unknown catalog product: ${relatedProduct.id}`);
    }
    if (!state.inspectedProductIds.has(relatedProduct.id)) {
      throw new Error(
        `Product was not inspected during this investigation: ${relatedProduct.id}`,
      );
    }

    return {
      id: catalogProduct.id,
      name: catalogProduct.name,
      price: catalogProduct.price,
      stock: catalogProduct.stock,
    };
  });

  const { action, sourceTerm, targetTerms } = parsed.recommendation;
  if (action === "create_synonym") {
    if (!sourceTerm || !targetTerms || targetTerms.length === 0) {
      throw new Error("A synonym recommendation requires source and target terms.");
    }
    if (!normalizeSearchText(query).includes(normalizeSearchText(sourceTerm))) {
      throw new Error("The synonym source term must come from the shopper query.");
    }
    const unsearchedTargets = targetTerms.filter(
      (term) => !state.searchedTerms.has(normalizeSearchText(term)),
    );
    if (unsearchedTargets.length > 0) {
      throw new Error(
        `Recommendation includes catalog terms that were not searched: ${unsearchedTargets.join(", ")}`,
      );
    }
  }

  if (action === "boost_products" && relatedProducts.length === 0) {
    throw new Error("A boost recommendation requires inspected products.");
  }

  const evidence = state.trace.map((event) => ({
    type: evidenceTypeByTool[event.tool],
    description: event.summary,
  }));

  return investigationResultSchema.parse({
    ...parsed,
    query,
    evidence,
    relatedProducts,
  });
}
