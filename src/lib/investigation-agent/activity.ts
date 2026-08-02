import type { InvestigationTraceEvent, ReadToolName } from "./types";

export interface AgentActivityItem {
  tool: ReadToolName;
  label: string;
  summary: string;
  terms: string[];
}

const activityLabels: Record<ReadToolName, string> = {
  getLeakContext: "Contexto da oportunidade",
  searchStorefront: "Busca atual testada",
  searchCatalog: "Catálogo investigado",
  getProductDetails: "Produtos inspecionados",
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function buildAgentActivity(
  trace: InvestigationTraceEvent[],
): AgentActivityItem[] {
  return trace.map((event) => ({
    tool: event.tool,
    label: activityLabels[event.tool],
    summary: event.summary,
    terms:
      event.tool === "searchCatalog"
        ? stringArray(event.input.searchTerms)
        : [],
  }));
}
