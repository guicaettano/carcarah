import {
  calculateAverageOrderValue,
  calculateBaselineConversionRate,
  calculateBaselineCtr,
  calculateEstimatedOpportunity,
  calculateSearchMetrics,
} from "./metrics";
import type {
  AnalysisSummary,
  Product,
  RevenueLeak,
  RevenueLeakSeverity,
  SearchEvent,
} from "./types";

const MIN_RELEVANT_SEARCHES = 50;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ignoredTokens = new Set([
  "a",
  "as",
  "com",
  "da",
  "de",
  "do",
  "e",
  "em",
  "para",
]);

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 1 && !ignoredTokens.has(token)),
  );
}

export function countMatchingProducts(query: string, products: Product[]): number {
  const queryTokens = tokenize(query);

  return products.filter((product) => {
    if (product.stock <= 0) return false;

    const searchableProduct = [
      product.name,
      product.description,
      product.category,
      ...product.tags,
    ].join(" ");
    const productTokens = tokenize(searchableProduct);
    const overlap = [...queryTokens].filter((token) => productTokens.has(token));
    const requiredOverlap = queryTokens.size <= 2 ? 1 : 2;

    return overlap.length >= requiredOverlap;
  }).length;
}

function calculateSeverityScore(
  event: SearchEvent,
  ctr: number,
  conversionRate: number,
  baselineCtr: number,
  baselineConversionRate: number,
  matchedProductCount: number,
): number {
  let score = 0;

  score += event.searches >= 150 ? 2 : event.searches >= 75 ? 1 : 0;
  score += ctr <= baselineCtr * 0.25 ? 2 : ctr <= baselineCtr * 0.55 ? 1 : 0;
  score += conversionRate === 0 ? 3 : conversionRate <= baselineConversionRate * 0.35 ? 2 : 0;
  score += event.purchases === 0 ? 1 : 0;
  score += matchedProductCount > 0 ? 1 : 0;

  return score;
}

function severityFromScore(score: number): RevenueLeakSeverity {
  if (score >= 8) return "high";
  if (score >= 6) return "medium";
  return "low";
}

function buildReason(
  event: SearchEvent,
  ctr: number,
  baselineCtr: number,
  matchedProductCount: number,
): string {
  const findings = [
    `${event.searches} searches produced ${event.purchases} purchases`,
  ];

  if (ctr < baselineCtr * 0.55) {
    findings.push("CTR is materially below the healthy-query baseline");
  }

  if (matchedProductCount > 0) {
    findings.push(
      `${matchedProductCount} in-stock catalog ${matchedProductCount === 1 ? "product matches" : "products match"} the query terms`,
    );
  }

  return `${findings.join(". ")}.`;
}

export function detectRevenueLeaks(
  searchEvents: SearchEvent[],
  products: Product[],
): RevenueLeak[] {
  const baselineConversionRate = calculateBaselineConversionRate(searchEvents);
  const baselineCtr = calculateBaselineCtr(searchEvents);
  const averageOrderValue = calculateAverageOrderValue(products);

  return searchEvents
    .flatMap((event): RevenueLeak[] => {
      const metrics = calculateSearchMetrics(event, averageOrderValue);
      const hasRelevantVolume = event.searches >= MIN_RELEVANT_SEARCHES;
      const hasConversionGap =
        metrics.conversionRate < baselineConversionRate * 0.45;
      const hasEngagementGap = metrics.ctr < baselineCtr * 0.6;
      const isLeak =
        hasRelevantVolume &&
        hasConversionGap &&
        (hasEngagementGap || event.purchases === 0);

      if (!isLeak) return [];

      const matchedProductCount = countMatchingProducts(event.query, products);
      const score = calculateSeverityScore(
        event,
        metrics.ctr,
        metrics.conversionRate,
        baselineCtr,
        baselineConversionRate,
        matchedProductCount,
      );

      return [
        {
          query: event.query,
          severity: severityFromScore(score),
          searches: event.searches,
          clicks: event.clicks,
          addToCarts: event.addToCarts,
          purchases: event.purchases,
          ctr: metrics.ctr,
          addToCartRate: metrics.addToCartRate,
          conversionRate: metrics.conversionRate,
          baselineCtr,
          baselineConversionRate,
          averageOrderValue,
          estimatedMonthlyOpportunity: calculateEstimatedOpportunity(
            event.searches,
            baselineConversionRate,
            averageOrderValue,
          ),
          matchedProductCount,
          reason: buildReason(
            event,
            metrics.ctr,
            baselineCtr,
            matchedProductCount,
          ),
          status: "detected",
        },
      ];
    })
    .sort(
      (left, right) =>
        right.estimatedMonthlyOpportunity -
        left.estimatedMonthlyOpportunity,
    );
}

export function summarizeAnalysis(
  searchEvents: SearchEvent[],
  leaks: RevenueLeak[],
): AnalysisSummary {
  return {
    queriesAnalyzed: searchEvents.length,
    leaksDetected: leaks.length,
    estimatedGmvOpportunity: leaks.reduce(
      (total, leak) => total + leak.estimatedMonthlyOpportunity,
      0,
    ),
    zeroConversionQueries: searchEvents.filter(
      (event) => event.purchases === 0,
    ).length,
  };
}
