import type { z } from "zod";

import type { SearchConfiguration } from "../commerce-search";
import type { searchActionProposalSchema } from "./schema";

export type SearchActionProposal = z.infer<typeof searchActionProposalSchema>;
export type SearchActionRisk = SearchActionProposal["risk"];

export interface SearchActionApproval {
  proposal: SearchActionProposal;
  token: string;
}

export interface SearchRuleChange {
  operation: "add" | "remove";
  collection: "synonymRules" | "queryRewriteRules";
  ruleId: string;
  source: string;
  targets: string[];
}

export interface ApplySearchRuleResult {
  config: SearchConfiguration;
  change: SearchRuleChange;
}

export interface StorefrontValidationSnapshot {
  resultCount: number;
  productIds: string[];
}

export interface RegressionCheckResult {
  query: string;
  beforeResultCount: number;
  afterResultCount: number;
  degraded: boolean;
}

export interface SearchChangeValidation {
  before: StorefrontValidationSnapshot;
  after: StorefrontValidationSnapshot;
  newRelevantProducts: string[];
  regressionChecks: RegressionCheckResult[];
  regressionDetected: boolean;
  validationPassed: boolean;
}

export type ActionTraceStep =
  | "human_approval"
  | "rule_validated"
  | "sandbox_applied"
  | "query_retested"
  | "results_measured"
  | "regression_checked"
  | "sandbox_reconstructed"
  | "sandbox_reverted"
  | "original_behavior_restored";

export interface ActionTraceEvent {
  step: ActionTraceStep;
  summary: string;
}

export interface ResolvedProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface SearchResolutionResponse {
  operation: "apply";
  query: string;
  proposal: SearchActionProposal;
  effectiveRisk: SearchActionRisk;
  configuration: SearchConfiguration;
  change: SearchRuleChange;
  validation: SearchChangeValidation;
  beforeProducts: ResolvedProduct[];
  afterProducts: ResolvedProduct[];
  estimatedMonthlyOpportunityAddressed: number;
  trace: ActionTraceEvent[];
}

export interface SearchRevertResponse {
  operation: "revert";
  query: string;
  configuration: SearchConfiguration;
  change: SearchRuleChange;
  restoredResultCount: number;
  restoredProductIds: string[];
  revertConfirmed: boolean;
  trace: ActionTraceEvent[];
}

export type SearchActionResponse =
  | SearchResolutionResponse
  | SearchRevertResponse;
