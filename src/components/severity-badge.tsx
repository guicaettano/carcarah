import type { RevenueLeakSeverity } from "@/lib/search-analysis";

const severityLabels: Record<RevenueLeakSeverity, string> = {
  high: "Alta prioridade",
  medium: "Média prioridade",
  low: "Baixa prioridade",
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
