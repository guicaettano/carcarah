import type { SearchConfiguration } from "../commerce-search";

export function createEmptySearchConfiguration(): SearchConfiguration {
  return { synonymRules: [], queryRewriteRules: [] };
}

export function cloneSearchConfiguration(
  config: SearchConfiguration,
): SearchConfiguration {
  return {
    synonymRules: config.synonymRules.map((rule) => ({
      ...rule,
      targets: [...rule.targets],
    })),
    queryRewriteRules: config.queryRewriteRules.map((rule) => ({
      ...rule,
      targets: [...rule.targets],
    })),
  };
}
