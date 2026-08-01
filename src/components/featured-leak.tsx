import Link from "next/link";

import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { RevenueLeak } from "@/lib/search-analysis";
import { SeverityBadge } from "./severity-badge";

export function FeaturedLeak({ leak }: { leak: RevenueLeak }) {
  return (
    <Link
      className="featured-leak"
      href={`/leaks/${encodeURIComponent(leak.query)}`}
      aria-label={`View analysis for ${leak.query}`}
    >
      <div className="featured-leak__header">
        <p className="section-kicker">Revenue leak detected</p>
        <SeverityBadge severity={leak.severity} />
      </div>

      <div className="featured-leak__body">
        <div>
          <h3>{leak.query}</h3>
          <p className="featured-leak__signal">
            {formatNumber.format(leak.searches)} searches
            <span aria-hidden="true">/</span>
            {formatNumber.format(leak.purchases)} conversions
          </p>
        </div>

        <div className="featured-leak__opportunity">
          <p>Estimated GMV opportunity</p>
          <strong>
            {formatCurrency.format(leak.estimatedMonthlyOpportunity)}
            <span>/ month</span>
          </strong>
        </div>
      </div>

      <div className="featured-leak__footer">
        <span>
          Status: <strong>Detected</strong>
        </span>
        <span className="text-link">View analysis →</span>
      </div>
    </Link>
  );
}
