"use client";
import type { SearchConfiguration } from "../commerce-search";
import type { DemoStorefrontSession } from "./types";
const STORAGE_KEY="carcarah:demo-search-configuration:v1";
function isRule(value:unknown){if(!value||typeof value!=="object")return false;const c=value as Record<string,unknown>;return typeof c.id==="string"&&typeof c.source==="string"&&Array.isArray(c.targets)&&c.targets.every(t=>typeof t==="string")&&c.reversible===true}
function isSearchConfiguration(value:unknown):value is SearchConfiguration{if(!value||typeof value!=="object")return false;const c=value as Record<string,unknown>;return Array.isArray(c.synonymRules)&&c.synonymRules.every(isRule)&&Array.isArray(c.queryRewriteRules)&&c.queryRewriteRules.every(isRule)}
export function persistDemoSearchConfiguration(configuration:SearchConfiguration){const payload:DemoStorefrontSession={version:1,configuration};window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(payload))}
export function readDemoSearchConfiguration():SearchConfiguration|null{const raw=window.sessionStorage.getItem(STORAGE_KEY);if(!raw)return null;try{const parsed=JSON.parse(raw) as Partial<DemoStorefrontSession>;if(parsed.version!==1||!isSearchConfiguration(parsed.configuration)){window.sessionStorage.removeItem(STORAGE_KEY);return null}return parsed.configuration}catch{window.sessionStorage.removeItem(STORAGE_KEY);return null}}
export function clearDemoSearchConfiguration(){window.sessionStorage.removeItem(STORAGE_KEY)}
