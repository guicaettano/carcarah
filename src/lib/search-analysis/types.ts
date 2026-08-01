export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  tags: string[];
}

export interface SearchEvent {
  query: string;
  searches: number;
  clicks: number;
  addToCarts: number;
  purchases: number;
}

export interface SearchMetrics {
  ctr: number;
  addToCartRate: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export type AverageOrderValueSource =
  | "storefront_results"
  | "catalog_fallback";

export interface AverageOrderValueEstimate {
  value: number;
  source: AverageOrderValueSource;
  productCount: number;
}

export type RevenueLeakSeverity = "high" | "medium" | "low";

export interface RevenueLeak {
  query: string;
  severity: RevenueLeakSeverity;
  searches: number;
  clicks: number;
  addToCarts: number;
  purchases: number;
  ctr: number;
  addToCartRate: number;
  conversionRate: number;
  baselineCtr: number;
  baselineConversionRate: number;
  relevantAverageOrderValue: number;
  averageOrderValueSource: AverageOrderValueSource;
  estimatedMonthlyOpportunity: number;
  storefrontResultCount: number;
  reason: string;
  status: "detected";
}

export interface AnalysisSummary {
  queriesAnalyzed: number;
  leaksDetected: number;
  estimatedGmvOpportunity: number;
  zeroConversionQueries: number;
}
