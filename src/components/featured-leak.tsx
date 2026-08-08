import Link from "next/link";

import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/lib/formatters";
import type { RevenueLeak } from "@/lib/search-analysis";
import { SeverityBadge } from "./severity-badge";

export function FeaturedLeak({ leak }: { leak: RevenueLeak }) {
  return (
    <div className="featured-leak-container">
      <Link
        aria-label={`Ver detalhes da busca ${leak.query}`}
        className="featured-leak"
        href={`/leaks/${encodeURIComponent(leak.query)}`}
      >
        <div className="featured-leak__header">
          <p className="section-kicker">Busca com oportunidade</p>
          <SeverityBadge severity={leak.severity} />
        </div>

        <div className="featured-leak__body">
          <div>
            <h3>{leak.query}</h3>
            <p className="featured-leak__signal">
              {formatNumber.format(leak.searches)} buscas
              <span aria-hidden="true">/</span>
              {formatNumber.format(leak.purchases)} compras
              <span aria-hidden="true">/</span>
              {formatPercentage(leak.conversionRate)} conversão
            </p>
          </div>

          <div className="featured-leak__opportunity">
            <p>Oportunidade estimada de GMV</p>
            <strong>
              {formatCurrency.format(leak.estimatedMonthlyOpportunity)}
              <span>/mês</span>
            </strong>
          </div>
        </div>

        <div className="featured-leak__footer">
          <span>
            Status: <strong>Detectado</strong>
          </span>
          <span className="text-link">Ver detalhes →</span>
        </div>
      </Link>
      
      <Link
        className="storefront-before-cta"
        href={`/storefront?q=${encodeURIComponent(leak.query)}&autosearch=1`}
      >
        Ver problema na loja ↗
      </Link>
    </div>
  );
}
