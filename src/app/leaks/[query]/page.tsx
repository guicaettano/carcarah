import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SeverityBadge } from "@/components/severity-badge";
import { products, searchEvents } from "@/lib/demo-data";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/lib/formatters";
import { detectRevenueLeaks } from "@/lib/search-analysis";

interface LeakDetailPageProps {
  params: Promise<{ query: string }>;
}

export function generateStaticParams() {
  return detectRevenueLeaks(searchEvents, products).map((leak) => ({
    query: leak.query,
  }));
}

export async function generateMetadata({
  params,
}: LeakDetailPageProps): Promise<Metadata> {
  const { query } = await params;
  return { title: `${decodeURIComponent(query)} | Carcarah` };
}

export default async function LeakDetailPage({ params }: LeakDetailPageProps) {
  const { query } = await params;
  const decodedQuery = decodeURIComponent(query);
  const leak = detectRevenueLeaks(searchEvents, products).find(
    (item) => item.query === decodedQuery,
  );

  if (!leak) notFound();

  const metrics = [
    ["Search volume", formatNumber.format(leak.searches)],
    ["Clicks", formatNumber.format(leak.clicks)],
    ["Add to carts", formatNumber.format(leak.addToCarts)],
    ["Purchases", formatNumber.format(leak.purchases)],
    ["CTR", formatPercentage(leak.ctr)],
    ["Conversion", formatPercentage(leak.conversionRate)],
  ];

  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/">
        ← Back to revenue leaks
      </Link>

      <section className="detail-hero">
        <div className="detail-hero__title">
          <div className="detail-hero__meta">
            <span className="demo-label">Demo data</span>
            <SeverityBadge severity={leak.severity} />
          </div>
          <h1>{leak.query}</h1>
          <p>{leak.reason}</p>
        </div>

        <div className="detail-opportunity">
          <p>Estimated GMV opportunity</p>
          <strong>{formatCurrency.format(leak.estimatedMonthlyOpportunity)}</strong>
          <span>per month</span>
        </div>
      </section>

      <section className="detail-section">
        <h2>Query metrics</h2>
        <div className="detail-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="analysis-grid">
        <div className="analysis-panel">
          <h2>Baseline comparison</h2>
          <dl>
            <div>
              <dt>Query conversion</dt>
              <dd>{formatPercentage(leak.conversionRate)}</dd>
            </div>
            <div>
              <dt>Healthy-query baseline</dt>
              <dd>{formatPercentage(leak.baselineConversionRate)}</dd>
            </div>
            <div>
              <dt>Query CTR</dt>
              <dd>{formatPercentage(leak.ctr)}</dd>
            </div>
            <div>
              <dt>Healthy-query CTR baseline</dt>
              <dd>{formatPercentage(leak.baselineCtr)}</dd>
            </div>
          </dl>
        </div>

        <div className="analysis-panel">
          <h2>Opportunity formula</h2>
          <p className="formula">
            Searches × baseline conversion × average order value
          </p>
          <p className="formula-values">
            {formatNumber.format(leak.searches)} ×{" "}
            {formatPercentage(leak.baselineConversionRate)} ×{" "}
            {formatCurrency.format(leak.averageOrderValue)}
          </p>
          <p className="panel-note">
            This is an estimate based on simulated demand and catalog data. It
            is not recovered or guaranteed revenue.
          </p>
        </div>
      </section>

      <section className="status-panel">
        <div>
          <span>Status</span>
          <strong>Detected</strong>
        </div>
        <div>
          <span>Catalog evidence</span>
          <strong>
            {leak.matchedProductCount} matching in-stock{" "}
            {leak.matchedProductCount === 1 ? "product" : "products"}
          </strong>
        </div>
      </section>
    </main>
  );
}
