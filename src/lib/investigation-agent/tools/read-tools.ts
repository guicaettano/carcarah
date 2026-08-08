import { tool } from "ai";
import { z } from "zod";

import {
  getProductById,
  normalizeSearchText,
  searchCatalogByTerms,
  searchStorefront,
} from "../../commerce-search";
import { products, searchEvents } from "../../demo-data";
import { formatCurrency, formatPercentage } from "../../formatters";
import { detectRevenueLeaks } from "../../search-analysis";
import type {
  InvestigationRuntimeState,
  InvestigationTraceEvent,
  ReadToolName,
} from "../types";

function addTrace(
  state: InvestigationRuntimeState,
  toolName: ReadToolName,
  input: Record<string, unknown>,
  summary: string,
): void {
  const event: InvestigationTraceEvent = { tool: toolName, input, summary };
  state.trace.push(event);
}

function assertBoundQuery(inputQuery: string, query: string): void {
  if (normalizeSearchText(inputQuery) !== normalizeSearchText(query)) {
    throw new Error("The tool can only inspect the revenue leak in this request.");
  }
}

function productSummary(productId: string) {
  const product = getProductById(productId, products);
  if (!product) return undefined;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    stock: product.stock,
    tags: product.tags,
  };
}

export function createInvestigationRuntimeState(): InvestigationRuntimeState {
  return {
    trace: [],
    catalogCandidateIds: new Set<string>(),
    inspectedProductIds: new Set<string>(),
    searchedTerms: new Set<string>(),
  };
}

export function createReadTools(
  query: string,
  state: InvestigationRuntimeState,
) {
  return {
    getLeakContext: tool({
      description:
        "Read deterministic metrics for the single revenue leak being investigated.",
      inputSchema: z.object({ query: z.string().min(1) }).strict(),
      execute: async ({ query: inputQuery }) => {
        assertBoundQuery(inputQuery, query);
        const leak = detectRevenueLeaks(searchEvents, products).find(
          (item) => item.query === query,
        );
        if (!leak) throw new Error("Revenue leak context was not found.");

        const context = {
          query: leak.query,
          searches: leak.searches,
          clicks: leak.clicks,
          purchases: leak.purchases,
          ctr: leak.ctr,
          conversionRate: leak.conversionRate,
          baselineConversionRate: leak.baselineConversionRate,
          estimatedMonthlyOpportunity: leak.estimatedMonthlyOpportunity,
          relevantAverageOrderValue: leak.relevantAverageOrderValue,
          averageOrderValueSource: leak.averageOrderValueSource,
        };
        addTrace(
          state,
          "getLeakContext",
          { query: inputQuery },
          `Contexto verificado: ${leak.searches} buscas, ${formatPercentage(leak.conversionRate)} de conversão, referência de ${formatPercentage(leak.baselineConversionRate)} e oportunidade estimada de ${formatCurrency.format(leak.estimatedMonthlyOpportunity)}.`,
        );
        return context;
      },
    }),

    searchStorefront: tool({
      description:
        "Test exactly what shoppers currently see for the revenue leak query.",
      inputSchema: z.object({ query: z.string().min(1) }).strict(),
      execute: async ({ query: inputQuery }) => {
        assertBoundQuery(inputQuery, query);
        const result = searchStorefront(inputQuery, products);
        const output = {
          query: result.query,
          total: result.total,
          results: result.results.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
          })),
        };
        addTrace(
          state,
          "searchStorefront",
          { query: inputQuery },
          `Busca atual testada: ${result.total} ${result.total === 1 ? "resultado retornado" : "resultados retornados"} para o termo usado pelo cliente.`,
        );
        return output;
      },
    }),

    searchCatalog: tool({
      description:
        "Search the catalog using semantic alternatives you choose. Terms are used literally and no synonym mapping is applied.",
      inputSchema: z
        .object({
          searchTerms: z.array(z.string().min(1)).min(1).max(6),
        })
        .strict(),
      execute: async ({ searchTerms }) => {
        const matches = searchCatalogByTerms(searchTerms, products).slice(0, 12);
        for (const term of searchTerms) {
          state.searchedTerms.add(normalizeSearchText(term));
        }
        for (const match of matches) {
          state.catalogCandidateIds.add(match.product.id);
        }

        const output = {
          searchTerms,
          total: matches.length,
          results: matches.map((match) => ({
            id: match.product.id,
            name: match.product.name,
            price: match.product.price,
            stock: match.product.stock,
            matchedTerms: match.matchedTerms,
          })),
        };
        addTrace(
          state,
          "searchCatalog",
          { searchTerms },
          `Catálogo pesquisado com ${searchTerms.map((term) => `“${term}”`).join(", ")}: ${matches.length} ${matches.length === 1 ? "produto candidato encontrado" : "produtos candidatos encontrados"}.`,
        );
        return output;
      },
    }),

    getProductDetails: tool({
      description:
        "Inspect full details for product IDs returned by searchCatalog in this investigation.",
      inputSchema: z
        .object({
          productIds: z.array(z.string().min(1)).min(1).max(8),
        })
        .strict(),
      execute: async ({ productIds }) => {
        const undiscoveredIds = productIds.filter(
          (productId) => !state.catalogCandidateIds.has(productId),
        );
        if (undiscoveredIds.length > 0) {
          throw new Error(
            `Product IDs must come from searchCatalog: ${undiscoveredIds.join(", ")}`,
          );
        }

        const foundProducts = productIds
          .map((productId) => productSummary(productId))
          .filter((product) => product !== undefined);
        for (const product of foundProducts) {
          state.inspectedProductIds.add(product.id);
        }
        addTrace(
          state,
          "getProductDetails",
          { productIds },
          `${foundProducts.length} ${foundProducts.length === 1 ? "produto candidato verificado" : "produtos candidatos verificados"}: ${foundProducts.map((product) => product.name).join(", ")}.`,
        );
        return { products: foundProducts };
      },
    }),
  } as const;
}

export type ReadTools = ReturnType<typeof createReadTools>;
