import { describe, expect, it } from "vitest";

import productsData from "../../../../data/products.json";
import searchEventsData from "../../../../data/search-events.json";
import {
  calculateConversionRate,
  calculateEstimatedOpportunity,
  detectRevenueLeaks,
} from "../index";
import type { Product, SearchEvent } from "../types";

const products = productsData as Product[];
const searchEvents = searchEventsData as SearchEvent[];

describe("search analysis metrics", () => {
  it("calculates conversion rate correctly", () => {
    const event: SearchEvent = {
      query: "test query",
      searches: 200,
      clicks: 80,
      addToCarts: 24,
      purchases: 10,
    };

    expect(calculateConversionRate(event)).toBe(0.05);
  });

  it("never returns a negative estimated opportunity", () => {
    expect(calculateEstimatedOpportunity(-100, 0.05, 200)).toBe(0);
    expect(calculateEstimatedOpportunity(100, -0.05, 200)).toBe(0);
    expect(calculateEstimatedOpportunity(100, 0.05, -200)).toBe(0);
  });
});

describe("revenue leak detector", () => {
  it("does not mark a healthy query as high severity", () => {
    const leaks = detectRevenueLeaks(searchEvents, products);
    const healthyQuery = leaks.find(
      (leak) => leak.query === "camiseta branca masculina",
    );

    expect(healthyQuery?.severity).not.toBe("high");
  });

  it("detects a high-volume query with zero conversions", () => {
    const events: SearchEvent[] = [
      {
        query: "healthy baseline",
        searches: 200,
        clicks: 80,
        addToCarts: 25,
        purchases: 12,
      },
      {
        query: "high demand no sales",
        searches: 190,
        clicks: 2,
        addToCarts: 0,
        purchases: 0,
      },
    ];

    const leaks = detectRevenueLeaks(events, products);

    expect(leaks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: "high demand no sales",
          severity: "high",
          status: "detected",
        }),
      ]),
    );
  });

  it("includes moletom canguru preto in demo revenue leaks", () => {
    const leaks = detectRevenueLeaks(searchEvents, products);
    const leak = leaks.find(
      (item) => item.query === "moletom canguru preto",
    );

    expect(leak).toBeDefined();
    expect(leak).toMatchObject({
      searches: 187,
      purchases: 0,
      severity: "high",
    });
    expect(leaks.slice(0, 3)).toContainEqual(leak);
  });
});
