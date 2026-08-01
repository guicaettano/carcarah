import type { Product, SearchEvent, SearchMetrics } from "./types";

export function calculateRate(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator <= 0) return 0;
  return numerator / denominator;
}

export function calculateCtr(event: SearchEvent): number {
  return calculateRate(event.clicks, event.searches);
}

export function calculateAddToCartRate(event: SearchEvent): number {
  return calculateRate(event.addToCarts, event.searches);
}

export function calculateConversionRate(event: SearchEvent): number {
  return calculateRate(event.purchases, event.searches);
}

export function calculateAverageOrderValue(products: Product[]): number {
  const availableProducts = products.filter(
    (product) => product.stock > 0 && product.price > 0,
  );

  if (availableProducts.length === 0) return 0;

  return (
    availableProducts.reduce((total, product) => total + product.price, 0) /
    availableProducts.length
  );
}

function getHealthyReferenceEvents(events: SearchEvent[]): SearchEvent[] {
  const healthyEvents = events.filter(
    (event) => event.searches > 0 && event.purchases > 0,
  );

  return healthyEvents.length > 0
    ? healthyEvents
    : events.filter((event) => event.searches > 0);
}

export function calculateBaselineConversionRate(events: SearchEvent[]): number {
  const referenceEvents = getHealthyReferenceEvents(events);
  const searches = referenceEvents.reduce(
    (total, event) => total + Math.max(0, event.searches),
    0,
  );
  const purchases = referenceEvents.reduce(
    (total, event) => total + Math.max(0, event.purchases),
    0,
  );

  return calculateRate(purchases, searches);
}

export function calculateBaselineCtr(events: SearchEvent[]): number {
  const referenceEvents = getHealthyReferenceEvents(events);
  const searches = referenceEvents.reduce(
    (total, event) => total + Math.max(0, event.searches),
    0,
  );
  const clicks = referenceEvents.reduce(
    (total, event) => total + Math.max(0, event.clicks),
    0,
  );

  return calculateRate(clicks, searches);
}

export function calculateEstimatedRevenue(
  event: SearchEvent,
  averageOrderValue: number,
): number {
  return Math.max(0, event.purchases) * Math.max(0, averageOrderValue);
}

/**
 * Demo estimate: searches x baseline conversion rate x average order value.
 * This is an opportunity estimate, not recovered or guaranteed revenue.
 */
export function calculateEstimatedOpportunity(
  searches: number,
  baselineConversionRate: number,
  averageOrderValue: number,
): number {
  return (
    Math.max(0, searches) *
    Math.max(0, baselineConversionRate) *
    Math.max(0, averageOrderValue)
  );
}

export function calculateSearchMetrics(
  event: SearchEvent,
  averageOrderValue: number,
): SearchMetrics {
  return {
    ctr: calculateCtr(event),
    addToCartRate: calculateAddToCartRate(event),
    conversionRate: calculateConversionRate(event),
    estimatedRevenue: calculateEstimatedRevenue(event, averageOrderValue),
  };
}
