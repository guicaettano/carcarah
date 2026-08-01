import {
  searchStorefront,
  tokenizeSearchText,
  type SearchConfiguration,
} from "../commerce-search";
import { products as demoProducts, searchEvents as demoEvents } from "../demo-data";
import { detectRevenueLeaks } from "../search-analysis";
import type { Product, SearchEvent } from "../search-analysis/types";
import type {
  RegressionCheckResult,
  SearchActionProposal,
  SearchChangeValidation,
} from "./types";

interface ValidationOptions {
  products?: Product[];
  searchEvents?: SearchEvent[];
  regressionLimit?: number;
}

function resultSnapshot(
  query: string,
  products: Product[],
  config: SearchConfiguration,
) {
  const result = searchStorefront(query, products, config);
  return {
    result,
    snapshot: {
      resultCount: result.total,
      productIds: result.results.map((product) => product.id),
    },
  };
}

export function selectRelatedHealthyQueries(
  originalQuery: string,
  proposal: SearchActionProposal,
  products: Product[] = demoProducts,
  searchEvents: SearchEvent[] = demoEvents,
  limit = 4,
): SearchEvent[] {
  const leakQueries = new Set(
    detectRevenueLeaks(searchEvents, products).map((leak) => leak.query),
  );
  const relevanceTokens = new Set(
    tokenizeSearchText(
      [originalQuery, proposal.source, ...proposal.targets].join(" "),
    ),
  );

  return searchEvents
    .filter(
      (event) =>
        event.query !== originalQuery &&
        event.purchases > 0 &&
        !leakQueries.has(event.query),
    )
    .map((event) => ({
      event,
      score: tokenizeSearchText(event.query).filter((token) =>
        relevanceTokens.has(token),
      ).length,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.event.searches - left.event.searches ||
        left.event.query.localeCompare(right.event.query),
    )
    .slice(0, limit)
    .map(({ event }) => event);
}

function runRegressionChecks(
  originalQuery: string,
  proposal: SearchActionProposal,
  originalConfig: SearchConfiguration,
  updatedConfig: SearchConfiguration,
  products: Product[],
  events: SearchEvent[],
  limit: number,
): RegressionCheckResult[] {
  return selectRelatedHealthyQueries(
    originalQuery,
    proposal,
    products,
    events,
    limit,
  ).map((event) => {
    const before = searchStorefront(event.query, products, originalConfig);
    const after = searchStorefront(event.query, products, updatedConfig);
    const afterIds = new Set(after.results.map((product) => product.id));
    const lostExistingProduct = before.results.some(
      (product) => !afterIds.has(product.id),
    );

    return {
      query: event.query,
      beforeResultCount: before.total,
      afterResultCount: after.total,
      degraded: after.total < before.total || lostExistingProduct,
    };
  });
}

export function validateSearchChange(
  originalQuery: string,
  proposal: SearchActionProposal,
  originalConfig: SearchConfiguration,
  updatedConfig: SearchConfiguration,
  options: ValidationOptions = {},
): SearchChangeValidation {
  const products = options.products ?? demoProducts;
  const events = options.searchEvents ?? demoEvents;
  const regressionLimit = options.regressionLimit ?? 4;
  const before = resultSnapshot(originalQuery, products, originalConfig);
  const after = resultSnapshot(originalQuery, products, updatedConfig);
  const beforeIds = new Set(before.snapshot.productIds);
  const newRelevantProducts = after.snapshot.productIds.filter(
    (productId) => !beforeIds.has(productId),
  );
  const regressionChecks = runRegressionChecks(
    originalQuery,
    proposal,
    originalConfig,
    updatedConfig,
    products,
    events,
    regressionLimit,
  );
  const regressionDetected = regressionChecks.some((check) => check.degraded);
  const measurableImprovement =
    after.snapshot.resultCount > before.snapshot.resultCount &&
    newRelevantProducts.length > 0;

  return {
    before: before.snapshot,
    after: after.snapshot,
    newRelevantProducts,
    regressionChecks,
    regressionDetected,
    validationPassed: measurableImprovement && !regressionDetected,
  };
}
