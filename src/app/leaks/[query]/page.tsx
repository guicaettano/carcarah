import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvestigationPanel } from "@/components/investigation-panel";
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
    ["Volume de buscas", formatNumber.format(leak.searches)],
    ["Cliques", formatNumber.format(leak.clicks)],
    ["Adições ao carrinho", formatNumber.format(leak.addToCarts)],
    ["Compras", formatNumber.format(leak.purchases)],
    ["CTR", formatPercentage(leak.ctr)],
    ["Conversão", formatPercentage(leak.conversionRate)],
  ];

  return (
    <main className="page-shell detail-page">
      <Link className="back-link" href="/">
        ← Voltar para oportunidades
      </Link>

      <section className="detail-hero">
        <div className="detail-hero__title">
          <div className="detail-hero__meta">
            <span className="demo-label">Busca com oportunidade</span>
            <SeverityBadge severity={leak.severity} />
          </div>
          <h1>{leak.query}</h1>
          <p className="detail-hero__signal">
            <span>{formatNumber.format(leak.searches)} buscas</span>
            <span>{formatNumber.format(leak.purchases)} compras</span>
            <span>{formatPercentage(leak.conversionRate)} conversão</span>
          </p>
        </div>

        <div className="detail-opportunity">
          <p>Oportunidade estimada de GMV</p>
          <strong>{formatCurrency.format(leak.estimatedMonthlyOpportunity)}</strong>
          <span>/mês</span>
          <small>
            Estimativa baseada na diferença entre esta busca e a referência de
            buscas saudáveis.
          </small>
        </div>
      </section>

      <InvestigationPanel
        query={leak.query}
        agentConfigured={Boolean(process.env.OPENAI_API_KEY)}
      />

      <section className="detail-section">
        <h2>Métricas da busca</h2>
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
          <h2>Comparação com a referência</h2>
          <dl>
            <div>
              <dt>Conversão desta busca</dt>
              <dd>{formatPercentage(leak.conversionRate)}</dd>
            </div>
            <div>
              <dt>Referência de conversão saudável</dt>
              <dd>{formatPercentage(leak.baselineConversionRate)}</dd>
            </div>
            <div>
              <dt>CTR desta busca</dt>
              <dd>{formatPercentage(leak.ctr)}</dd>
            </div>
            <div>
              <dt>Referência de CTR saudável</dt>
              <dd>{formatPercentage(leak.baselineCtr)}</dd>
            </div>
          </dl>
        </div>

        <div className="analysis-panel">
          <h2>Cálculo da oportunidade</h2>
          <p className="formula">
            Buscas × máx(0, conversão de referência - conversão da busca) ×
            ticket médio relevante
          </p>
          <p className="formula-values">
            {formatNumber.format(leak.searches)} ×{" "}
            ({formatPercentage(leak.baselineConversionRate)} -{" "}
            {formatPercentage(leak.conversionRate)}) ×{" "}
            {formatCurrency.format(leak.relevantAverageOrderValue)}
          </p>
          <p className="panel-note">
            Fonte do ticket médio:{" "}
            {leak.averageOrderValueSource === "storefront_results"
              ? "preço médio dos produtos disponíveis retornados pela busca."
              : "preço médio dos produtos disponíveis no catálogo de demonstração, pois a busca não retorna resultados."}
            {" "}Esta é uma estimativa de oportunidade, não uma receita recuperada
            ou garantida.
          </p>
        </div>
      </section>

      <section className="status-panel">
        <div>
          <span>Status</span>
          <strong>Detectado</strong>
        </div>
        <div>
          <span>Resultado atual da busca</span>
          <strong>
            {leak.storefrontResultCount}{" "}
            {leak.storefrontResultCount === 1
              ? "produto disponível"
              : "produtos disponíveis"}
          </strong>
        </div>
      </section>

    </main>
  );
}
