import { FeaturedLeak } from "@/components/featured-leak";
import { LeakList } from "@/components/leak-list";
import { SummaryMetrics } from "@/components/summary-metrics";
import { products, searchEvents } from "@/lib/demo-data";
import { detectRevenueLeaks, summarizeAnalysis } from "@/lib/search-analysis";

export default function DashboardPage() {
  const leaks = detectRevenueLeaks(searchEvents, products);
  const summary = summarizeAnalysis(searchEvents, leaks);
  const [featuredLeak, ...remainingLeaks] = leaks;

  return (
    <main className="page-shell">
      <section className="dashboard-hero">
        <div className="dashboard-intro">
          <p className="section-kicker">Inteligência de busca</p>
          <h1>Encontre onde sua busca está deixando vendas escapar.</h1>
          <p>
            O Carcarah investiga perdas na busca e propõe alterações seguras
            quando encontra uma causa suportada pelo MVP.
          </p>
        </div>
      </section>

      <SummaryMetrics summary={summary} />

      <section className="leaks-section">
        <div className="section-heading">
          <h2>Oportunidades perdidas</h2>
          <p>
            Priorizadas pelo potencial estimado de GMV mensal em dados de
            demonstração.
          </p>
        </div>

        {featuredLeak ? (
          <>
            <FeaturedLeak leak={featuredLeak} />
            <LeakList leaks={remainingLeaks} />
          </>
        ) : (
          <div className="empty-state">
            <h3>Nenhuma oportunidade detectada</h3>
            <p>Todas as buscas analisadas estão dentro da referência atual.</p>
          </div>
        )}
      </section>

      <p className="data-disclaimer">
        Dados sintéticos usados para demonstrar o fluxo agentivo. A oportunidade
        de GMV é uma estimativa, não uma receita recuperada.
      </p>
    </main>
  );
}
