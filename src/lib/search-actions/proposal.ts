import {
  normalizeSearchText,
  searchCatalogByTerms,
  tokenizeSearchText,
} from "../commerce-search";
import { searchActionProposalSchema } from "./schema";
import type { SearchActionProposal, SearchActionRisk } from "./types";

const riskRank: Record<SearchActionRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function maxRisk(...risks: SearchActionRisk[]): SearchActionRisk {
  return risks.reduce((highest, risk) =>
    riskRank[risk] > riskRank[highest] ? risk : highest,
  );
}

function containsTokenSequence(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) return false;

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token),
  );
}

function hypothesisSupportsTarget(hypothesis: string, target: string): boolean {
  const hypothesisTokens = tokenizeSearchText(hypothesis);
  const targetTokens = tokenizeSearchText(target);

  return (
    targetTokens.length > 0 &&
    (targetTokens.every((token) => hypothesisTokens.includes(token)) ||
      hypothesisTokens.every((token) => targetTokens.includes(token)))
  );
}

export function assessSearchActionRisk(
  proposal: SearchActionProposal,
  query: string,
): SearchActionRisk {
  const queryTokens = tokenizeSearchText(query);
  const sourceTokens = tokenizeSearchText(proposal.source);

  if (!containsTokenSequence(queryTokens, sourceTokens)) return "high";
  if (
    proposal.type === "query_rewrite" &&
    normalizeSearchText(proposal.source) !== normalizeSearchText(query)
  ) {
    return "high";
  }
  if (proposal.targets.length > 3 || proposal.confidence < 0.65) return "high";

  const policyRisk: SearchActionRisk =
    proposal.type === "query_rewrite" ||
    sourceTokens.length > 2 ||
    proposal.confidence < 0.8
      ? "medium"
      : "low";

  return maxRisk(proposal.risk, policyRisk);
}

interface GroundProposalOptions {
  query: string;
  supportedTerms: Iterable<string>;
  supportedProductIds: Iterable<string>;
}

export function groundSearchActionProposal(
  candidate: unknown,
  options: GroundProposalOptions,
): SearchActionProposal {
  const proposal = searchActionProposalSchema.parse(candidate);
  const queryTokens = tokenizeSearchText(options.query);
  const sourceTokens = tokenizeSearchText(proposal.source);
  const supportedTerms = [...options.supportedTerms];
  const supportedProductIds = new Set(options.supportedProductIds);

  if (!containsTokenSequence(queryTokens, sourceTokens)) {
    throw new Error("The executable rule source must come from the shopper query.");
  }
  if (
    proposal.type === "query_rewrite" &&
    normalizeSearchText(proposal.source) !== normalizeSearchText(options.query)
  ) {
    throw new Error("A query rewrite source must match the complete shopper query.");
  }

  for (const target of proposal.targets) {
    if (!supportedTerms.some((term) => hypothesisSupportsTarget(term, target))) {
      throw new Error(
        `Executable target was not supported by a catalog hypothesis: ${target}`,
      );
    }

    const groundedMatch = searchCatalogByTerms([target]).some((match) =>
      supportedProductIds.has(match.product.id),
    );
    if (!groundedMatch) {
      throw new Error(
        `Executable target has no inspected supporting product: ${target}`,
      );
    }
  }

  return searchActionProposalSchema.parse({
    ...proposal,
    source: normalizeSearchText(proposal.source),
    targets: [...new Set(proposal.targets.map(normalizeSearchText))],
    risk: assessSearchActionRisk(proposal, options.query),
  });
}
