import { products as demoProducts } from "../demo-data";
import type { Product } from "../search-analysis/types";
import type {
  CatalogSearchMatch,
  SearchConfiguration,
  StorefrontSearchResult,
} from "./types";

const STOP_WORDS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "para",
]);

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function productSearchText(product: Product): string {
  return [
    product.name,
    product.description,
    product.category,
    ...product.tags,
  ].join(" ");
}

function productTokenSet(product: Product): Set<string> {
  return new Set(tokenizeSearchText(productSearchText(product)));
}

function titleTokenSet(product: Product): Set<string> {
  return new Set(tokenizeSearchText(product.name));
}

function matchesAll(tokens: string[], productTokens: Set<string>): boolean {
  return tokens.length > 0 && tokens.every((token) => productTokens.has(token));
}

function containsTokenSequence(tokens: string[], sequence: string[]): number {
  if (sequence.length === 0 || sequence.length > tokens.length) return -1;

  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return index;
    }
  }

  return -1;
}

function replaceTokenSequence(
  tokens: string[],
  source: string[],
  target: string[],
): string[] | undefined {
  const start = containsTokenSequence(tokens, source);
  if (start < 0) return undefined;

  return [
    ...tokens.slice(0, start),
    ...target,
    ...tokens.slice(start + source.length),
  ];
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function buildSearchVariants(
  query: string,
  config?: SearchConfiguration,
): string[][] {
  const originalTokens = tokenizeSearchText(query);
  const variants = new Map<string, string[]>();
  const addVariant = (tokens: string[]) => {
    const unique = uniqueTokens(tokens);
    if (unique.length > 0) variants.set(unique.join(" "), unique);
  };

  addVariant(originalTokens);
  if (!config) return [...variants.values()];

  for (const rule of config.synonymRules) {
    const sourceTokens = tokenizeSearchText(rule.source);
    for (const target of rule.targets) {
      const rewritten = replaceTokenSequence(
        originalTokens,
        sourceTokens,
        tokenizeSearchText(target),
      );
      if (rewritten) addVariant(rewritten);
    }
  }

  for (const rule of config.queryRewriteRules) {
    if (normalizeSearchText(rule.source) !== normalizeSearchText(query)) continue;
    for (const target of rule.targets) {
      addVariant(tokenizeSearchText(target));
    }
  }

  return [...variants.values()];
}

/**
 * Simulates the store's current lexical search. Every meaningful query token
 * must exist in the indexed product metadata, so vocabulary mismatches remain
 * visible exactly as shoppers experience them.
 */
export function searchStorefront(
  query: string,
  catalog: Product[] = demoProducts,
  config?: SearchConfiguration,
): StorefrontSearchResult {
  const queryVariants = buildSearchVariants(query, config);

  const results = catalog
    .filter((product) => product.stock > 0)
    .filter((product) => {
      const productTokens = productTokenSet(product);
      return queryVariants.some((tokens) => matchesAll(tokens, productTokens));
    })
    .sort((left, right) => {
      const leftTitle = titleTokenSet(left);
      const rightTitle = titleTokenSet(right);
      const score = (titleTokens: Set<string>) =>
        Math.max(
          ...queryVariants.map(
            (tokens) => tokens.filter((token) => titleTokens.has(token)).length,
          ),
        );
      const leftScore = score(leftTitle);
      const rightScore = score(rightTitle);

      return rightScore - leftScore || left.name.localeCompare(right.name);
    });

  return {
    query,
    total: results.length,
    results,
    executedQueries: queryVariants.map((tokens) => tokens.join(" ")),
  };
}

/**
 * Searches the catalog using only the terms supplied by the caller. Each term
 * or phrase is treated as an alternative lexical hypothesis. No synonym map is
 * applied by the function.
 */
export function searchCatalogByTerms(
  searchTerms: string[],
  catalog: Product[] = demoProducts,
): CatalogSearchMatch[] {
  const termGroups = searchTerms
    .map((term) => ({ original: term, tokens: tokenizeSearchText(term) }))
    .filter((term) => term.tokens.length > 0);

  return catalog
    .filter((product) => product.stock > 0)
    .flatMap((product): CatalogSearchMatch[] => {
      const productTokens = productTokenSet(product);
      const titleTokens = titleTokenSet(product);
      const matchedTerms = termGroups
        .filter((term) => matchesAll(term.tokens, productTokens))
        .map((term) => term.original);

      if (matchedTerms.length === 0) return [];

      const score = termGroups.reduce((total, term) => {
        if (!matchesAll(term.tokens, productTokens)) return total;
        const titleMatches = term.tokens.filter((token) =>
          titleTokens.has(token),
        ).length;
        return total + term.tokens.length + titleMatches;
      }, 0);

      return [{ product, matchedTerms, score }];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.product.name.localeCompare(right.product.name),
    );
}

export function getProductById(
  productId: string,
  catalog: Product[] = demoProducts,
): Product | undefined {
  return catalog.find((product) => product.id === productId);
}

export type {
  CatalogSearchMatch,
  QueryRewriteRule,
  SearchConfiguration,
  StorefrontSearchResult,
  SynonymRule,
} from "./types";
