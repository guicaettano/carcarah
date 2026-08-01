import productsData from "../../data/products.json";
import searchEventsData from "../../data/search-events.json";
import type { Product, SearchEvent } from "./search-analysis";

export const products = productsData as Product[];
export const searchEvents = searchEventsData as SearchEvent[];
