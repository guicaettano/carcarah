import Link from "next/link";

import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/lib/formatters";
import type { RevenueLeak } from "@/lib/search-analysis";
import { SeverityBadge } from "./severity-badge";

export function LeakList({ leaks }: { leaks: RevenueLeak[] }) {
  if (leaks.length === 0) {
    return (
      <div className="empty-state">
        <h3>No additional leaks detected</h3>
        <p>The current dataset has no other queries that meet the threshold.</p>
      </div>
    );
  }

  return (
    <div className="leak-list">
      <div className="leak-list__header" aria-hidden="true">
        <span>Query</span>
        <span>Volume</span>
        <span>Conversion</span>
        <span>Severity</span>
        <span>Opportunity</span>
      </div>
      {leaks.map((leak) => (
        <Link
          className="leak-row"
          href={`/leaks/${encodeURIComponent(leak.query)}`}
          key={leak.query}
        >
          <span className="leak-row__query">{leak.query}</span>
          <span data-label="Volume">{formatNumber.format(leak.searches)}</span>
          <span data-label="Conversion">
            {formatPercentage(leak.conversionRate)}
          </span>
          <span data-label="Severity">
            <SeverityBadge severity={leak.severity} />
          </span>
          <span className="leak-row__opportunity" data-label="Opportunity">
            {formatCurrency.format(leak.estimatedMonthlyOpportunity)}
            <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
