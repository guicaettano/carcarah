import { searchStorefront, type SearchConfiguration } from "../commerce-search";
import { products } from "../demo-data";

export function executeStorefrontSearch(
  query: string,
  configuration?: SearchConfiguration,
) {
  return searchStorefront(query, products, configuration);
}
