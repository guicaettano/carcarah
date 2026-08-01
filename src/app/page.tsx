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
      <section className="dashboard-intro">
        <p className="section-kicker">Search intelligence</p>
        <h1>Hunt down revenue leaks in commerce search.</h1>
        <p>
          Deterministic analysis that shows where shopper demand is failing to
          convert into orders.
        </p>
      </section>

      <SummaryMetrics summary={summary} />

      <section className="leaks-section">
        <div className="section-heading">
          <h2>Revenue leaks</h2>
          <p>
            Ranked by estimated monthly GMV opportunity using simulated data.
          </p>
        </div>

        {featuredLeak ? (
          <>
            <FeaturedLeak leak={featuredLeak} />
            <LeakList leaks={remainingLeaks} />
          </>
        ) : (
          <div className="empty-state">
            <h3>No revenue leaks detected</h3>
            <p>All analyzed queries are performing within the current baseline.</p>
          </div>
        )}
      </section>

      <p className="data-disclaimer">
        Demo data. GMV opportunity is an estimate, not recovered revenue.
      </p>
    </main>
  );
}
