"use client";

import { useState } from "react";

import type {
  InvestigationResponse,
  InvestigationResult,
} from "@/lib/investigation-agent/types";
import type {
  SearchActionApproval,
  SearchResolutionResponse,
  SearchRevertResponse,
} from "@/lib/search-actions/types";
import { formatCurrency } from "@/lib/formatters";

type InvestigationState =
  | { status: "idle" }
  | { status: "investigating" }
  | { status: "completed"; data: InvestigationResponse }
  | { status: "error"; message: string };

type ActionStatus = "idle" | "applying" | "applied" | "reverting" | "reverted";

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
  create_synonym: "Recommend a search rule",
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
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [resolution, setResolution] =
    useState<SearchResolutionResponse | null>(null);
  const [revertResult, setRevertResult] =
    useState<SearchRevertResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function resetActionState() {
    setActionStatus("idle");
    setResolution(null);
    setRevertResult(null);
    setActionError(null);
  }

  async function investigate() {
    resetActionState();
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

  async function applyInSandbox(approval: SearchActionApproval) {
    setActionStatus("applying");
    setActionError(null);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "apply",
          query,
          proposal: approval.proposal,
          approvalToken: approval.token,
        }),
      });
      const body = (await response.json()) as
        | SearchResolutionResponse
        | { error?: string };
      if (!response.ok || !("operation" in body) || body.operation !== "apply") {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "The sandbox action could not be completed.",
        );
      }

      setResolution(body);
      setActionStatus("applied");
    } catch (error) {
      setActionStatus("idle");
      setActionError(
        error instanceof Error
          ? error.message
          : "The sandbox action could not be completed.",
      );
    }
  }

  async function revertSandboxChange(approval: SearchActionApproval) {
    if (!resolution) return;
    setActionStatus("reverting");
    setActionError(null);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "revert",
          query,
          proposal: approval.proposal,
          approvalToken: approval.token,
          ruleId: resolution.change.ruleId,
        }),
      });
      const body = (await response.json()) as
        | SearchRevertResponse
        | { error?: string };
      if (!response.ok || !("operation" in body) || body.operation !== "revert") {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "The sandbox change could not be reverted.",
        );
      }

      setRevertResult(body);
      setActionStatus("reverted");
    } catch (error) {
      setActionStatus("applied");
      setActionError(
        error instanceof Error
          ? error.message
          : "The sandbox change could not be reverted.",
      );
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
            Carcarah inspects this leak with read-only tools. Applying a search
            rule always requires separate human approval.
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
          <InvestigationReport
            actionError={actionError}
            actionStatus={actionStatus}
            onApply={applyInSandbox}
            onRevert={revertSandboxChange}
            resolution={resolution}
            response={state.data}
            revertResult={revertResult}
          />
        ) : null}
      </div>
    </section>
  );
}

interface InvestigationReportProps {
  response: InvestigationResponse;
  actionStatus: ActionStatus;
  actionError: string | null;
  resolution: SearchResolutionResponse | null;
  revertResult: SearchRevertResponse | null;
  onApply: (approval: SearchActionApproval) => Promise<void>;
  onRevert: (approval: SearchActionApproval) => Promise<void>;
}

function InvestigationReport({
  response,
  actionStatus,
  actionError,
  resolution,
  revertResult,
  onApply,
  onRevert,
}: InvestigationReportProps) {
  const { investigation, trace, approval } = response;
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
          <h3>Recommended action</h3>
          <div className="recommendation-card">
            <strong>{actionLabels[recommendation.action]}</strong>
            {approval ? (
              <ExecutableProposal approval={approval} />
            ) : recommendation.action === "boost_products" ? (
              <p>Review a ranking boost outside this sandbox milestone.</p>
            ) : (
              <p>Carcarah did not find a safe executable search rule.</p>
            )}
            <span>
              Recommendation only. Nothing changes until a human approves the
              demo sandbox action.
            </span>
          </div>

          {approval && !resolution ? (
            <ApprovalControl
              actionError={actionError}
              actionStatus={actionStatus}
              approval={approval}
              onApply={onApply}
            />
          ) : null}
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

      {resolution && approval ? (
        <SandboxResolution
          actionError={actionError}
          actionStatus={actionStatus}
          approval={approval}
          onRevert={onRevert}
          resolution={resolution}
          revertResult={revertResult}
        />
      ) : null}
    </div>
  );
}

function ExecutableProposal({ approval }: { approval: SearchActionApproval }) {
  const { proposal } = approval;
  return (
    <div className="executable-proposal">
      <dl>
        <div>
          <dt>Executable rule</dt>
          <dd>{proposal.type.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>Demo storefront only</dd>
        </div>
      </dl>
      <p>
        <code>{proposal.source}</code> → {proposal.targets.join(", ")}
      </p>
      <small>{proposal.rationale}</small>
    </div>
  );
}

interface ApprovalControlProps {
  approval: SearchActionApproval;
  actionStatus: ActionStatus;
  actionError: string | null;
  onApply: (approval: SearchActionApproval) => Promise<void>;
}

function ApprovalControl({
  approval,
  actionStatus,
  actionError,
  onApply,
}: ApprovalControlProps) {
  const risk = approval.proposal.risk;
  const blocked = risk === "high";

  return (
    <div className={`approval-control approval-control--${risk}`}>
      <strong>Human approval required</strong>
      <p>
        {risk === "low"
          ? "Low-risk rules can be applied after approval."
          : risk === "medium"
            ? "Medium-risk preview. Review the rule carefully before applying it."
            : "High-risk rules cannot be applied in the demo sandbox."}
      </p>
      <button
        className="sandbox-apply-button"
        disabled={blocked || actionStatus === "applying"}
        onClick={() => onApply(approval)}
        type="button"
      >
        {actionStatus === "applying"
          ? "Applying in demo sandbox..."
          : blocked
            ? "High risk · apply blocked"
            : "Approve & apply in demo sandbox"}
      </button>
      {actionError ? <p className="action-inline-error">{actionError}</p> : null}
    </div>
  );
}

interface SandboxResolutionProps {
  approval: SearchActionApproval;
  resolution: SearchResolutionResponse;
  revertResult: SearchRevertResponse | null;
  actionStatus: ActionStatus;
  actionError: string | null;
  onRevert: (approval: SearchActionApproval) => Promise<void>;
}

function SandboxResolution({
  approval,
  resolution,
  revertResult,
  actionStatus,
  actionError,
  onRevert,
}: SandboxResolutionProps) {
  const { validation } = resolution;
  const reverted = actionStatus === "reverted" && revertResult;

  return (
    <section className="sandbox-resolution" aria-labelledby="sandbox-result-title">
      <div className="sandbox-resolution__heading">
        <div>
          <p className="section-kicker">Act + validate</p>
          <h3 id="sandbox-result-title">
            {validation.validationPassed
              ? "Search leak resolved in sandbox"
              : "Sandbox validation did not pass"}
          </h3>
        </div>
        <span className="sandbox-scope">Demo sandbox only</span>
      </div>

      <div className="before-after">
        <div className="search-state search-state--before">
          <span>Before</span>
          <h4>{resolution.query}</h4>
          <strong>
            {validation.before.resultCount} {validation.before.resultCount === 1 ? "product" : "products"} found
          </strong>
        </div>
        <div className="before-after__bridge" aria-hidden="true">
          <span>Carcarah sandbox rule</span>
          <strong>→</strong>
        </div>
        <div className="search-state search-state--after">
          <span>After</span>
          <h4>{resolution.query}</h4>
          <strong>
            {validation.after.resultCount} {validation.after.resultCount === 1 ? "product" : "products"} found
          </strong>
          <div className="resolved-products">
            {resolution.afterProducts.map((product) => (
              <article key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.stock} in stock</span>
                </div>
                <p>{formatCurrency.format(product.price)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="validation-summary">
        <div>
          <span>Estimated GMV opportunity addressed</span>
          <strong>
            {formatCurrency.format(
              resolution.estimatedMonthlyOpportunityAddressed,
            )} per month
          </strong>
          <p>This remains an estimate. No revenue is reported as recovered.</p>
        </div>
        <div>
          <span>Regression check</span>
          <strong>
            {validation.regressionDetected
              ? "Related query degradation detected"
              : "No healthy demo queries degraded"}
          </strong>
          <p>{validation.regressionChecks.length} related healthy queries checked.</p>
        </div>
      </div>

      <ActionTrace trace={reverted ? revertResult.trace : resolution.trace} />

      <div className="revert-control">
        {reverted ? (
          <div className="revert-confirmation" role="status">
            <strong>Sandbox change reverted</strong>
            <p>
              Original behavior restored with {revertResult.restoredResultCount}{" "}
              {revertResult.restoredResultCount === 1 ? "result" : "results"}.
            </p>
          </div>
        ) : (
          <button
            className="revert-button"
            disabled={actionStatus === "reverting"}
            onClick={() => onRevert(approval)}
            type="button"
          >
            {actionStatus === "reverting"
              ? "Reverting sandbox change..."
              : "Revert sandbox change"}
          </button>
        )}
        {actionError ? <p className="action-inline-error">{actionError}</p> : null}
      </div>
    </section>
  );
}

function ActionTrace({ trace }: { trace: SearchResolutionResponse["trace"] }) {
  return (
    <details className="action-trace" open>
      <summary>Action trace · {trace.length} verified operations</summary>
      <ol>
        {trace.map((event, index) => (
          <li key={`${event.step}-${index}`}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{event.step.replaceAll("_", " ")}</strong>
              <p>{event.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
