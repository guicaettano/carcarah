import {
  normalizeSearchText,
  type QueryRewriteRule,
  type SearchConfiguration,
  type SynonymRule,
} from "../../commerce-search";
import { searchActionProposalSchema } from "../schema";
import { cloneSearchConfiguration } from "../configuration";
import type {
  ApplySearchRuleResult,
  SearchActionProposal,
} from "../types";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizedProposal(candidate: SearchActionProposal): SearchActionProposal {
  const proposal = searchActionProposalSchema.parse(candidate);
  return {
    ...proposal,
    source: normalizeSearchText(proposal.source),
    targets: [...new Set(proposal.targets.map(normalizeSearchText))],
  };
}

export function applySearchRule(
  proposalCandidate: SearchActionProposal,
  currentConfig: SearchConfiguration,
): ApplySearchRuleResult {
  const proposal = normalizedProposal(proposalCandidate);
  const config = cloneSearchConfiguration(currentConfig);
  const ruleId = `rule_${stableHash(
    JSON.stringify({
      type: proposal.type,
      source: proposal.source,
      targets: proposal.targets,
    }),
  )}`;
  const rule = {
    id: ruleId,
    source: proposal.source,
    targets: proposal.targets,
    reversible: true as const,
  };
  const collection =
    proposal.type === "synonym_rule"
      ? "synonymRules"
      : "queryRewriteRules";

  if (collection === "synonymRules") {
    config.synonymRules.push(rule satisfies SynonymRule);
  } else {
    config.queryRewriteRules.push(rule satisfies QueryRewriteRule);
  }

  return {
    config,
    change: {
      operation: "add",
      collection,
      ruleId,
      source: rule.source,
      targets: rule.targets,
    },
  };
}

export function revertSearchRule(
  currentConfig: SearchConfiguration,
  ruleId: string,
): ApplySearchRuleResult {
  const config = cloneSearchConfiguration(currentConfig);
  const synonymRule = config.synonymRules.find((rule) => rule.id === ruleId);
  const rewriteRule = config.queryRewriteRules.find((rule) => rule.id === ruleId);
  const rule = synonymRule ?? rewriteRule;

  if (!rule) throw new Error("Sandbox search rule was not found.");

  const collection = synonymRule ? "synonymRules" : "queryRewriteRules";
  config.synonymRules = config.synonymRules.filter((item) => item.id !== ruleId);
  config.queryRewriteRules = config.queryRewriteRules.filter(
    (item) => item.id !== ruleId,
  );

  return {
    config,
    change: {
      operation: "remove",
      collection,
      ruleId,
      source: rule.source,
      targets: rule.targets,
    },
  };
}

/** The only write capability exposed by the deterministic Act runtime. */
export const ACT_WRITE_TOOLS = Object.freeze({ applySearchRule });
