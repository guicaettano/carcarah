import type { SearchConfiguration } from "../commerce-search";
export interface StorefrontProduct{id:string;name:string;category:string;price:number;stock:number}
export interface StorefrontApiResponse{query:string;total:number;results:StorefrontProduct[]}
export interface DemoStorefrontSession{version:1;configuration:SearchConfiguration}
