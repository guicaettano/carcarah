import type { RevenueLeakSeverity } from "@/lib/search-analysis";

const severityLabels: Record<RevenueLeakSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({
  severity,
}: {
  severity: RevenueLeakSeverity;
}) {
  return (
    <span className={`severity severity--${severity}`}>
      {severityLabels[severity]}
    </span>
  );
}
