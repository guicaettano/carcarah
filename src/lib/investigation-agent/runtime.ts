import {
  generateText,
  Output,
  stepCountIs,
  type PrepareStepFunction,
} from "ai";
import {
  createOpenAI,
  type OpenAIResponsesProviderOptions,
} from "@ai-sdk/openai";

import { investigationResultSchema } from "./schema";
import { createSearchActionApproval } from "../search-actions/authorization";
import {
  createInvestigationRuntimeState,
  createReadTools,
  type ReadTools,
} from "./tools/read-tools";
import type { InvestigationResponse, InvestigationResult } from "./types";
import {
  createSafeInvestigationFallback,
  InvestigationGroundingError,
  validateAndGroundInvestigationResult,
} from "./validation";

export const INVESTIGATION_MODEL = "gpt-5.6-sol";

export class AgentRuntimeNotConfiguredError extends Error {
  constructor() {
    super("Agent runtime requires OPENAI_API_KEY.");
    this.name = "AgentRuntimeNotConfiguredError";
  }
}

function createStepPreparation(
  state: ReturnType<typeof createInvestigationRuntimeState>,
): PrepareStepFunction<ReadTools> {
  return async () => {
    const calledTools = new Set(state.trace.map((event) => event.tool));

    if (!calledTools.has("getLeakContext")) {
      return { toolChoice: { type: "tool", toolName: "getLeakContext" } };
    }
    if (!calledTools.has("searchStorefront")) {
      return { toolChoice: { type: "tool", toolName: "searchStorefront" } };
    }
    if (!calledTools.has("searchCatalog")) {
      return { toolChoice: { type: "tool", toolName: "searchCatalog" } };
    }
    if (
      state.catalogCandidateIds.size > 0 &&
      !calledTools.has("getProductDetails")
    ) {
      return { toolChoice: { type: "tool", toolName: "getProductDetails" } };
    }

    return { toolChoice: "auto" };
  };
}

const providerOptions = {
  openai: {
    reasoningEffort: "low",
    parallelToolCalls: false,
    store: false,
    strictJsonSchema: true,
    textVerbosity: "low",
  } satisfies OpenAIResponsesProviderOptions,
};

function structuredInvestigationOutput() {
  return Output.object({
    name: "carcarah_investigation",
    description: "Grounded diagnosis and recommended action for one query.",
    schema: investigationResultSchema,
  });
}

async function repairInvestigationResult(
  openai: ReturnType<typeof createOpenAI>,
  query: string,
  candidate: InvestigationResult,
  state: ReturnType<typeof createInvestigationRuntimeState>,
): Promise<InvestigationResult> {
  const searchedTerms = [...state.searchedTerms];
  const inspectedProductIds = [...state.inspectedProductIds];
  const result = await generateText({
    model: openai.responses(INVESTIGATION_MODEL),
    system: `You repair a structured commerce-search investigation that failed server-side grounding.

Return a corrected investigation using only evidence already collected.
- recommendation.targetTerms must contain only exact values from the allowed searched terms
- relatedProducts must contain only IDs from the allowed inspected product IDs
- actionProposal targets must be supported by the allowed searched terms
- actionProposal source must be a contiguous segment of the shopper query
- if no grounded executable recommendation is possible, use no_action with null sourceTerm, targetTerms, and actionProposal
- never invent or broaden evidence
- write every user-facing field in Brazilian Portuguese, using sentence case`,
    prompt: JSON.stringify({
      shopperQuery: query,
      allowedSearchedTerms: searchedTerms,
      allowedInspectedProductIds: inspectedProductIds,
      candidate,
    }),
    output: structuredInvestigationOutput(),
    maxOutputTokens: 2_000,
    timeout: { totalMs: 30_000 },
    providerOptions,
  });

  return result.output;
}

export async function investigateRevenueLeak(
  query: string,
): Promise<InvestigationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AgentRuntimeNotConfiguredError();

  const openai = createOpenAI({ apiKey });
  const state = createInvestigationRuntimeState();
  const tools = createReadTools(query, state);

  const result = await generateText({
    model: openai.responses(INVESTIGATION_MODEL),
    system: `You investigate one detected commerce-search revenue leak.

Success means:
- inspect the deterministic leak metrics and current storefront result
- form semantic hypotheses and choose your own alternative catalog search terms
- inspect candidate products before citing them
- diagnose the root cause and recommend, but never execute, one allowed action
- keep catalog search hypotheses separate from an executable search rule
- for a synonym recommendation, propose the smallest safe source segment from the shopper query; use a full query rewrite only when a narrower synonym would be unsafe
- return only claims supported by tool results

Constraints:
- tools are read-only
- never invent products, metrics, prices, stock, sales, or evidence
- related products must have been returned by searchCatalog and inspected with getProductDetails
- executable targets must be supported by terms tested with searchCatalog and inspected products
- actionProposal is required only for create_synonym; otherwise return null
- actionProposal scope is demo_storefront and reversible is true
- never call or simulate a write tool; human approval happens after this run
- if evidence is insufficient, use unknown and no_action
- write diagnosis and actionProposal.rationale in Brazilian Portuguese, using sentence case and an operational tone
- stop after the structured investigation is complete`,
    prompt: `Investigate this detected revenue leak: ${query}`,
    tools,
    prepareStep: createStepPreparation(state),
    stopWhen: stepCountIs(8),
    output: structuredInvestigationOutput(),
    maxOutputTokens: 2_000,
    timeout: { totalMs: 60_000, stepMs: 20_000 },
    providerOptions,
  });

  let investigation: InvestigationResult;
  try {
    investigation = validateAndGroundInvestigationResult(
      result.output,
      query,
      state,
    );
  } catch (error) {
    if (!(error instanceof InvestigationGroundingError)) throw error;

    console.warn("Carcarah is repairing an ungrounded investigation", error);
    try {
      const repairedCandidate = await repairInvestigationResult(
        openai,
        query,
        result.output,
        state,
      );
      investigation = validateAndGroundInvestigationResult(
        repairedCandidate,
        query,
        state,
      );
    } catch (repairError) {
      console.warn(
        "Carcarah could not repair the investigation; returning a safe fallback",
        repairError,
      );
      investigation = createSafeInvestigationFallback(query, state);
    }
  }

  const approval = investigation.actionProposal
    ? createSearchActionApproval(
        query,
        investigation.actionProposal,
        state.searchedTerms,
        investigation.relatedProducts.map((product) => product.id),
      )
    : null;

  return { investigation, trace: state.trace, approval };
}
