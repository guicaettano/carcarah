import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { AnalysisSummary } from "@/lib/search-analysis";

export function SummaryMetrics({ summary }: { summary: AnalysisSummary }) {
  const metrics = [
    {
      label: "Buscas monitoradas",
      value: formatNumber.format(summary.searchesMonitored),
    },
    {
      label: "Consultas únicas",
      value: formatNumber.format(summary.queriesAnalyzed),
    },
    {
      label: "Oportunidades detectadas",
      value: formatNumber.format(summary.leaksDetected),
    },
    {
      label: "Oportunidade estimada de GMV",
      value: formatCurrency.format(summary.estimatedGmvOpportunity),
      note: "/mês",
    },
  ];

  return (
    <div className="metrics-block">
      <section aria-label="Resumo da análise" className="metrics">
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
      <p className="metrics-block__note">Dados sintéticos de demonstração.</p>
    </div>
  );
}
