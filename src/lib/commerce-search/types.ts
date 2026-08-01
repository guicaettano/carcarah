import type { Product } from "../search-analysis/types";

export interface StorefrontSearchResult {
  query: string;
  total: number;
  results: Product[];
}

export interface CatalogSearchMatch {
  product: Product;
  matchedTerms: string[];
  score: number;
}
