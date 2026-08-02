import { getProductById, searchStorefront } from "../commerce-search";
import { products, searchEvents } from "../demo-data";
import { detectRevenueLeaks } from "../search-analysis";
import {
  verifySearchActionApproval,
  type SearchActionAuthorizationPayload,
} from "./authorization";
import { createEmptySearchConfiguration } from "./configuration";
import { assessSearchActionRisk, groundSearchActionProposal } from "./proposal";
import {
  applySearchRule,
  revertSearchRule,
  ACT_WRITE_TOOLS,
} from "./tools/write-tools";
import type {
  ActionTraceEvent,
  ResolvedProduct,
  SearchActionProposal,
  SearchActionRisk,
  SearchResolutionResponse,
  SearchRevertResponse,
} from "./types";
import { validateSearchChange } from "./validation";

export { ACT_WRITE_TOOLS };

export class SearchActionRiskError extends Error {
  constructor() {
    super("High-risk search actions cannot be applied in the demo sandbox.");
    this.name = "SearchActionRiskError";
  }
}

const riskLabels: Record<SearchActionRisk, string> = {
  low: "baixo",
  medium: "médio",
  high: "alto",
};

function detectedLeak(query: string) {
  return detectRevenueLeaks(searchEvents, products).find(
    (leak) => leak.query === query,
  );
}

function authorizedProposal(
  query: string,
  proposal: SearchActionProposal,
  approvalToken: string,
): {
  proposal: SearchActionProposal;
  authorization: SearchActionAuthorizationPayload;
} {
  const authorization = verifySearchActionApproval(
    approvalToken,
    query,
    proposal,
  );
  const grounded = groundSearchActionProposal(proposal, {
    query,
    supportedTerms: authorization.supportedTerms,
    supportedProductIds: authorization.supportedProductIds,
  });

  return { proposal: grounded, authorization };
}

function productSummaries(productIds: string[]): ResolvedProduct[] {
  return productIds.flatMap((productId): ResolvedProduct[] => {
    const product = getProductById(productId, products);
    return product
      ? [
          {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
          },
        ]
      : [];
  });
}

interface ExecuteActionInput {
  query: string;
  proposal: SearchActionProposal;
  approvalToken: string;
}

export function executeApprovedSearchAction({
  query,
  proposal: proposalCandidate,
  approvalToken,
}: ExecuteActionInput): SearchResolutionResponse {
  const leak = detectedLeak(query);
  if (!leak) throw new Error("The query is not a currently detected revenue leak.");

  const trace: ActionTraceEvent[] = [
    {
      step: "human_approval",
      summary: "Aprovação humana recebida para uma alteração no sandbox de demonstração.",
    },
  ];
  const { proposal } = authorizedProposal(
    query,
    proposalCandidate,
    approvalToken,
  );
  const effectiveRisk = assessSearchActionRisk(proposal, query);
  if (effectiveRisk === "high") throw new SearchActionRiskError();
  trace.push({
    step: "rule_validated",
    summary: `Regra de busca validada com risco efetivo ${riskLabels[effectiveRisk]}.`,
  });

  const originalConfig = createEmptySearchConfiguration();
  const applied = applySearchRule(proposal, originalConfig);
  trace.push({
    step: "sandbox_applied",
    summary: `Regra ${applied.change.ruleId} adicionada à coleção ${applied.change.collection} do sandbox.`,
  });

  const validation = validateSearchChange(
    query,
    proposal,
    originalConfig,
    applied.config,
  );
  trace.push({
    step: "query_retested",
    summary: "Busca original do cliente testada antes e depois da regra no sandbox.",
  });
  trace.push({
    step: "results_measured",
    summary: `${validation.after.resultCount} ${validation.after.resultCount === 1 ? "produto retornado" : "produtos retornados"} após a alteração no sandbox, incluindo ${validation.newRelevantProducts.length} ${validation.newRelevantProducts.length === 1 ? "novo resultado" : "novos resultados"}.`,
  });
  trace.push({
    step: "regression_checked",
    summary: validation.regressionDetected
      ? `${validation.regressionChecks.length} buscas saudáveis relacionadas verificadas; uma regressão foi detectada.`
      : `${validation.regressionChecks.length} buscas saudáveis relacionadas verificadas; nenhuma foi prejudicada.`,
  });

  return {
    operation: "apply",
    query,
    proposal,
    effectiveRisk,
    configuration: applied.config,
    change: applied.change,
    validation,
    beforeProducts: productSummaries(validation.before.productIds),
    afterProducts: productSummaries(validation.after.productIds),
    estimatedMonthlyOpportunityAddressed: validation.validationPassed
      ? leak.estimatedMonthlyOpportunity
      : 0,
    trace,
  };
}

interface RevertActionInput extends ExecuteActionInput {
  ruleId: string;
}

export function revertApprovedSearchAction({
  query,
  proposal: proposalCandidate,
  approvalToken,
  ruleId,
}: RevertActionInput): SearchRevertResponse {
  if (!detectedLeak(query)) {
    throw new Error("The query is not a currently detected revenue leak.");
  }
  const { proposal } = authorizedProposal(
    query,
    proposalCandidate,
    approvalToken,
  );
  if (assessSearchActionRisk(proposal, query) === "high") {
    throw new SearchActionRiskError();
  }

  const trace: ActionTraceEvent[] = [
    {
      step: "human_approval",
      summary: "Solicitação humana de reversão recebida para o sandbox de demonstração.",
    },
  ];
  const originalConfig = createEmptySearchConfiguration();
  const reconstructed = applySearchRule(proposal, originalConfig);
  if (reconstructed.change.ruleId !== ruleId) {
    throw new Error("The requested rule does not match the approved action.");
  }
  trace.push({
    step: "sandbox_reconstructed",
    summary: `Estado do sandbox reconstruído com a regra ${ruleId}.`,
  });

  const reverted = revertSearchRule(reconstructed.config, ruleId);
  trace.push({
    step: "sandbox_reverted",
    summary: `Regra ${ruleId} removida do sandbox de demonstração.`,
  });

  const originalResult = searchStorefront(query, products, originalConfig);
  const restoredResult = searchStorefront(query, products, reverted.config);
  const originalIds = originalResult.results.map((product) => product.id);
  const restoredProductIds = restoredResult.results.map((product) => product.id);
  const revertConfirmed =
    JSON.stringify(originalIds) === JSON.stringify(restoredProductIds);
  trace.push({
    step: "original_behavior_restored",
    summary: revertConfirmed
      ? `Comportamento original da loja restaurado com ${restoredResult.total} resultados.`
      : "O sandbox revertido não corresponde ao comportamento original da loja.",
  });

  return {
    operation: "revert",
    query,
    configuration: reverted.config,
    change: reverted.change,
    restoredResultCount: restoredResult.total,
    restoredProductIds,
    revertConfirmed,
    trace,
  };
}
