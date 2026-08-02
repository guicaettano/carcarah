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
        <h3>Nenhuma outra oportunidade detectada</h3>
        <p>Não há outras buscas que atendam aos critérios atuais.</p>
      </div>
    );
  }

  return (
    <div className="leak-list">
      <div className="leak-list__header" aria-hidden="true">
        <span>Busca</span>
        <span>Volume</span>
        <span>Conversão</span>
        <span>Prioridade</span>
        <span>Oportunidade</span>
      </div>
      {leaks.map((leak) => (
        <Link
          className="leak-row"
          href={`/leaks/${encodeURIComponent(leak.query)}`}
          key={leak.query}
        >
          <span className="leak-row__query">{leak.query}</span>
          <span data-label="Volume">{formatNumber.format(leak.searches)}</span>
          <span data-label="Conversão">
            {formatPercentage(leak.conversionRate)}
          </span>
          <span data-label="Prioridade">
            <SeverityBadge severity={leak.severity} />
          </span>
          <span className="leak-row__opportunity" data-label="Oportunidade">
            {formatCurrency.format(leak.estimatedMonthlyOpportunity)}
            <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
