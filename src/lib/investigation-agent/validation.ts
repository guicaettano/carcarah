import { normalizeSearchText } from "../commerce-search";
import { products } from "../demo-data";
import { groundSearchActionProposal } from "../search-actions/proposal";
import { investigationResultSchema } from "./schema";
import type {
  InvestigationResult,
  InvestigationRuntimeState,
  InvestigationTraceEvent,
  ReadToolName,
} from "./types";

export class InvestigationGroundingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvestigationGroundingError";
  }
}

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
    throw new InvestigationGroundingError(
      `Investigation did not execute required tool: ${toolName}`,
    );
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
      throw new InvestigationGroundingError(
        `Unknown catalog product: ${relatedProduct.id}`,
      );
    }
    if (!state.inspectedProductIds.has(relatedProduct.id)) {
      throw new InvestigationGroundingError(
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
      throw new InvestigationGroundingError(
        "A synonym recommendation requires source and target terms.",
      );
    }
    if (!normalizeSearchText(query).includes(normalizeSearchText(sourceTerm))) {
      throw new InvestigationGroundingError(
        "The synonym source term must come from the shopper query.",
      );
    }
    const unsearchedTargets = targetTerms.filter(
      (term) => !state.searchedTerms.has(normalizeSearchText(term)),
    );
    if (unsearchedTargets.length > 0) {
      throw new InvestigationGroundingError(
        `Recommendation includes catalog terms that were not searched: ${unsearchedTargets.join(", ")}`,
      );
    }
  }

  if (action === "boost_products" && relatedProducts.length === 0) {
    throw new InvestigationGroundingError(
      "A boost recommendation requires inspected products.",
    );
  }

  if (action === "create_synonym" && !parsed.actionProposal) {
    throw new InvestigationGroundingError(
      "A synonym recommendation requires an executable proposal.",
    );
  }
  if (action !== "create_synonym" && parsed.actionProposal) {
    throw new InvestigationGroundingError(
      "Only a grounded synonym recommendation can produce a search action proposal.",
    );
  }

  let actionProposal = null;
  if (parsed.actionProposal) {
    try {
      actionProposal = groundSearchActionProposal(parsed.actionProposal, {
        query,
        supportedTerms: state.searchedTerms,
        supportedProductIds: state.inspectedProductIds,
      });
    } catch (error) {
      throw new InvestigationGroundingError(
        error instanceof Error
          ? error.message
          : "The executable proposal could not be grounded.",
      );
    }
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
    actionProposal,
  });
}

export function createSafeInvestigationFallback(
  query: string,
  state: InvestigationRuntimeState,
): InvestigationResult {
  return validateAndGroundInvestigationResult(
    {
      query,
      diagnosis:
        "O Carcarah analisou os dados disponíveis, mas não reuniu evidências suficientes para recomendar uma alteração segura.",
      rootCause: "unknown",
      evidence: [
        {
          type: "leak_metrics",
          description: "A investigação foi concluída sem uma recomendação executável.",
        },
      ],
      relatedProducts: [],
      recommendation: {
        action: "no_action",
        sourceTerm: null,
        targetTerms: null,
      },
      actionProposal: null,
      confidence: 0,
      risk: "low",
    },
    query,
    state,
  );
}
