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
  averageOrderValue: number;
  estimatedMonthlyOpportunity: number;
  matchedProductCount: number;
  reason: string;
  status: "detected";
}

export interface AnalysisSummary {
  queriesAnalyzed: number;
  leaksDetected: number;
  estimatedGmvOpportunity: number;
  zeroConversionQueries: number;
}
