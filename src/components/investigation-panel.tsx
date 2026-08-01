"use client";

import { useState } from "react";

import type {
  InvestigationResponse,
  InvestigationResult,
} from "@/lib/investigation-agent/types";
import { formatCurrency } from "@/lib/formatters";

type InvestigationState =
  | { status: "idle" }
  | { status: "investigating" }
  | { status: "completed"; data: InvestigationResponse }
  | { status: "error"; message: string };

interface InvestigationPanelProps {
  query: string;
  agentConfigured: boolean;
}

const rootCauseLabels: Record<InvestigationResult["rootCause"], string> = {
  vocabulary_mismatch: "Vocabulary mismatch",
  ranking_problem: "Ranking problem",
  catalog_gap: "Catalog gap",
  stock_problem: "Stock problem",
  unknown: "Unknown",
};

const actionLabels: Record<
  InvestigationResult["recommendation"]["action"],
  string
> = {
  create_synonym: "Recommend a search synonym",
  boost_products: "Recommend boosting related products",
  no_action: "No action recommended",
};

function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
}

export function InvestigationPanel({
  query,
  agentConfigured,
}: InvestigationPanelProps) {
  const [state, setState] = useState<InvestigationState>({ status: "idle" });

  async function investigate() {
    setState({ status: "investigating" });

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = (await response.json()) as
        | InvestigationResponse
        | { error?: string };

      if (!response.ok || !("investigation" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "The investigation could not be completed.",
        );
      }

      setState({ status: "completed", data: body });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The investigation could not be completed.",
      });
    }
  }

  const isInvestigating = state.status === "investigating";

  return (
    <section className="investigation-section" aria-labelledby="investigation-title">
      <div className="investigation-section__heading">
        <div>
          <p className="section-kicker">Investigate</p>
          <h2 id="investigation-title">Agent analysis</h2>
          <p>
            Carcarah can inspect this leak with read-only tools, test semantic
            hypotheses, and recommend a next action.
          </p>
        </div>
        <button
          className="investigate-button"
          disabled={!agentConfigured || isInvestigating}
          onClick={investigate}
          type="button"
        >
          {isInvestigating
            ? "Investigating..."
            : state.status === "completed" || state.status === "error"
              ? "Run investigation again"
              : "Investigate with Carcarah"}
        </button>
      </div>

      {!agentConfigured ? (
        <div className="agent-notice" role="status">
          Agent runtime is not configured. Add <code>OPENAI_API_KEY</code> to
          enable a real investigation.
        </div>
      ) : null}

      <div aria-live="polite">
        {isInvestigating ? (
          <div className="investigation-progress" role="status">
            <span className="investigation-progress__dot" aria-hidden="true" />
            Inspecting leak metrics, storefront results, and catalog evidence.
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="investigation-error" role="alert">
            <strong>Investigation failed</strong>
            <p>{state.message}</p>
          </div>
        ) : null}

        {state.status === "completed" ? (
          <InvestigationReport response={state.data} />
        ) : null}
      </div>
    </section>
  );
}

function InvestigationReport({ response }: { response: InvestigationResponse }) {
  const { investigation, trace } = response;
  const { recommendation } = investigation;

  return (
    <div className="investigation-report">
      <p className="investigation-report__kicker">Carcarah investigation</p>
      <div className="investigation-report__summary">
        <div>
          <span>Root cause</span>
          <strong>{rootCauseLabels[investigation.rootCause]}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>{confidenceLabel(investigation.confidence)}</strong>
        </div>
        <div>
          <span>Recommendation risk</span>
          <strong>{investigation.risk}</strong>
        </div>
      </div>

      <div className="investigation-report__diagnosis">
        <h3>Diagnosis</h3>
        <p>{investigation.diagnosis}</p>
      </div>

      <div className="investigation-report__grid">
        <div>
          <h3>Observed evidence</h3>
          <ol className="evidence-list">
            {investigation.evidence.map((item, index) => (
              <li key={`${item.type}-${index}`}>
                <span>{item.type.replaceAll("_", " ")}</span>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3>Recommended next action</h3>
          <div className="recommendation-card">
            <strong>{actionLabels[recommendation.action]}</strong>
            {recommendation.action === "create_synonym" &&
            recommendation.sourceTerm &&
            recommendation.targetTerms ? (
              <p>
                Map shopper term <code>{recommendation.sourceTerm}</code> to
                tested catalog terms: {recommendation.targetTerms.join(", ")}.
              </p>
            ) : recommendation.action === "boost_products" ? (
              <p>
                Review a ranking boost for the inspected related products.
              </p>
            ) : (
              <p>
                Carcarah did not find enough grounded evidence for a change.
              </p>
            )}
            <span>Recommendation only. No storefront changes were made.</span>
          </div>
        </div>
      </div>

      {investigation.relatedProducts.length > 0 ? (
        <div className="related-products">
          <h3>Inspected related products</h3>
          <div className="related-products__grid">
            {investigation.relatedProducts.map((product) => (
              <article key={product.id}>
                <span>{product.id}</span>
                <strong>{product.name}</strong>
                <p>
                  {formatCurrency.format(product.price)} · {product.stock} in
                  stock
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <details className="agent-trace">
        <summary>Agent trace · {trace.length} read-only tool calls</summary>
        <ol>
          {trace.map((event, index) => (
            <li key={`${event.tool}-${index}`}>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{event.tool}</strong>
                <p>{event.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
