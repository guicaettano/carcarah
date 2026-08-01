import {
  calculateBaselineConversionRate,
  calculateBaselineCtr,
  calculateEstimatedOpportunity,
  calculateRelevantAverageOrderValue,
  calculateSearchMetrics,
} from "./metrics";
import { searchStorefront } from "../commerce-search";
import type {
  AnalysisSummary,
  Product,
  RevenueLeak,
  RevenueLeakSeverity,
  SearchEvent,
} from "./types";

const MIN_RELEVANT_SEARCHES = 50;

function calculateSeverityScore(
  event: SearchEvent,
  ctr: number,
  conversionRate: number,
  baselineCtr: number,
  baselineConversionRate: number,
  storefrontResultCount: number,
): number {
  let score = 0;

  score += event.searches >= 150 ? 2 : event.searches >= 75 ? 1 : 0;
  score += ctr <= baselineCtr * 0.25 ? 2 : ctr <= baselineCtr * 0.55 ? 1 : 0;
  score += conversionRate === 0 ? 3 : conversionRate <= baselineConversionRate * 0.35 ? 2 : 0;
  score += event.purchases === 0 ? 1 : 0;
  score += storefrontResultCount === 0 ? 1 : 0;

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
  storefrontResultCount: number,
): string {
  const findings = [
    `${event.searches} searches produced ${event.purchases} purchases`,
  ];

  if (ctr < baselineCtr * 0.55) {
    findings.push("CTR is materially below the healthy-query baseline");
  }

  findings.push(
    storefrontResultCount === 0
      ? "The current storefront search returns no results"
      : `The current storefront search returns ${storefrontResultCount} ${storefrontResultCount === 1 ? "result" : "results"}`,
  );

  return `${findings.join(". ")}.`;
}

export function detectRevenueLeaks(
  searchEvents: SearchEvent[],
  products: Product[],
): RevenueLeak[] {
  const baselineConversionRate = calculateBaselineConversionRate(searchEvents);
  const baselineCtr = calculateBaselineCtr(searchEvents);

  return searchEvents
    .flatMap((event): RevenueLeak[] => {
      const relevantAverageOrderValue = calculateRelevantAverageOrderValue(
        event.query,
        products,
      );
      const metrics = calculateSearchMetrics(
        event,
        relevantAverageOrderValue.value,
      );
      const hasRelevantVolume = event.searches >= MIN_RELEVANT_SEARCHES;
      const hasConversionGap =
        metrics.conversionRate < baselineConversionRate * 0.45;
      const hasEngagementGap = metrics.ctr < baselineCtr * 0.6;
      const isLeak =
        hasRelevantVolume &&
        hasConversionGap &&
        (hasEngagementGap || event.purchases === 0);

      if (!isLeak) return [];

      const storefrontResultCount = searchStorefront(
        event.query,
        products,
      ).total;
      const score = calculateSeverityScore(
        event,
        metrics.ctr,
        metrics.conversionRate,
        baselineCtr,
        baselineConversionRate,
        storefrontResultCount,
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
          relevantAverageOrderValue: relevantAverageOrderValue.value,
          averageOrderValueSource: relevantAverageOrderValue.source,
          estimatedMonthlyOpportunity: calculateEstimatedOpportunity(
            event.searches,
            baselineConversionRate,
            metrics.conversionRate,
            relevantAverageOrderValue.value,
          ),
          storefrontResultCount,
          reason: buildReason(
            event,
            metrics.ctr,
            baselineCtr,
            storefrontResultCount,
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
