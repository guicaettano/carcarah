import type { Product } from "../search-analysis/types";

export interface StorefrontSearchResult {
  query: string;
  total: number;
  results: Product[];
  executedQueries: string[];
}

export interface CatalogSearchMatch {
  product: Product;
  matchedTerms: string[];
  score: number;
}

export interface SynonymRule {
  id: string;
  source: string;
  targets: string[];
  reversible: true;
}

export interface QueryRewriteRule {
  id: string;
  source: string;
  targets: string[];
  reversible: true;
}

export interface SearchConfiguration {
  synonymRules: SynonymRule[];
  queryRewriteRules: QueryRewriteRule[];
}
