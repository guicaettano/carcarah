import type { z } from "zod";
import type { investigationResultSchema } from "./schema";

export const READ_TOOL_NAMES = [
  "getLeakContext",
  "searchStorefront",
  "searchCatalog",
  "getProductDetails",
] as const;

export type ReadToolName = (typeof READ_TOOL_NAMES)[number];

export type InvestigationResult = z.infer<typeof investigationResultSchema>;

export interface InvestigationTraceEvent {
  tool: ReadToolName;
  input: Record<string, unknown>;
  summary: string;
}

export interface InvestigationResponse {
  investigation: InvestigationResult;
  trace: InvestigationTraceEvent[];
}

export interface InvestigationRuntimeState {
  trace: InvestigationTraceEvent[];
  catalogCandidateIds: Set<string>;
  inspectedProductIds: Set<string>;
  searchedTerms: Set<string>;
}
