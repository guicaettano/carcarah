import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { AnalysisSummary } from "@/lib/search-analysis";

export function SummaryMetrics({ summary }: { summary: AnalysisSummary }) {
  const metrics = [
    {
      label: "Queries analyzed",
      value: formatNumber.format(summary.queriesAnalyzed),
    },
    {
      label: "Revenue leaks detected",
      value: formatNumber.format(summary.leaksDetected),
    },
    {
      label: "Estimated GMV opportunity",
      value: formatCurrency.format(summary.estimatedGmvOpportunity),
      note: "per month",
    },
    {
      label: "Queries with zero conversions",
      value: formatNumber.format(summary.zeroConversionQueries),
    },
  ];

  return (
    <section className="metrics" aria-label="Analysis summary">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <p className="metric__label">{metric.label}</p>
          <p className="metric__value">
            {metric.value}
            {metric.note ? <span>{metric.note}</span> : null}
          </p>
        </div>
      ))}
    </section>
  );
}
