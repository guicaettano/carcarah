"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import type {
  InvestigationResponse,
  InvestigationResult,
  InvestigationTraceEvent,
} from "@/lib/investigation-agent/types";
import type {
  ActionTraceEvent,
  SearchActionApproval,
  SearchResolutionResponse,
  SearchRevertResponse,
} from "@/lib/search-actions/types";
import { formatCurrency } from "@/lib/formatters";
import { buildAgentActivity } from "@/lib/investigation-agent/activity";
import { persistDemoSearchConfiguration } from "@/lib/storefront-demo/session";

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

interface ApiErrorBody {
  code?: string;
}

const rootCauseLabels: Record<InvestigationResult["rootCause"], string> = {
  vocabulary_mismatch: "Diferença de vocabulário",
  ranking_problem: "Problema de ordenação",
  catalog_gap: "Lacuna no catálogo",
  stock_problem: "Problema de estoque",
  unknown: "Causa ainda não identificada",
};

const actionLabels: Record<
  InvestigationResult["recommendation"]["action"],
  string
> = {
  create_synonym: "Recomendar uma regra de busca",
  boost_products: "Recomendar ajuste de ordenação",
  no_action: "Nenhuma ação recomendada",
};

const riskLabels: Record<InvestigationResult["risk"], string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

const evidenceLabels: Record<
  InvestigationResult["evidence"][number]["type"],
  string
> = {
  leak_metrics: "Desempenho da busca",
  storefront_results: "Resultado atual",
  catalog_search: "Investigação do catálogo",
  product_details: "Detalhes dos produtos",
};

const proposalTypeLabels: Record<
  SearchActionApproval["proposal"]["type"],
  string
> = {
  query_rewrite: "Reescrita da busca",
  synonym_rule: "Regra de sinônimo",
};

function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function investigationError(code?: string): string {
  if (code === "AGENT_NOT_CONFIGURED") {
    return "O Carcarah ainda não está configurado para executar a investigação.";
  }
  if (code === "NOT_REVENUE_LEAK") {
    return "Esta busca não aparece mais entre as oportunidades detectadas.";
  }
  return "Não foi possível concluir a investigação. Tente novamente.";
}

function actionRequestError(code?: string): string {
  if (code === "HIGH_RISK_ACTION") {
    return "A alteração foi bloqueada pela política de segurança.";
  }
  if (code === "ACTION_NOT_AUTHORIZED") {
    return "A aprovação expirou ou não corresponde à ação investigada.";
  }
  return "Não foi possível aplicar a alteração no sandbox.";
}

function revertRequestError(code?: string): string {
  if (code === "ACTION_NOT_AUTHORIZED") {
    return "A aprovação expirou ou não corresponde à alteração aplicada.";
  }
  return "Não foi possível reverter a alteração no sandbox.";
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
        | ApiErrorBody;

      if (!response.ok || !("investigation" in body)) {
        throw new Error(investigationError("code" in body ? body.code : undefined));
      }

      setState({ status: "completed", data: body });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a investigação. Tente novamente.",
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
        | ApiErrorBody;
      if (!response.ok || !("operation" in body) || body.operation !== "apply") {
        throw new Error(actionRequestError("code" in body ? body.code : undefined));
      }

      setResolution(body);
      setActionStatus("applied");
      persistDemoSearchConfiguration(body.configuration);
    } catch (error) {
      setActionStatus("idle");
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a alteração no sandbox.",
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
      const body = (await response.json()) as SearchRevertResponse | ApiErrorBody;
      if (!response.ok || !("operation" in body) || body.operation !== "revert") {
        throw new Error(revertRequestError("code" in body ? body.code : undefined));
      }

      setRevertResult(body);
      if (body.revertConfirmed) {
        setActionStatus("reverted");
        persistDemoSearchConfiguration(body.configuration);
      } else {
        setActionStatus("applied");
        setActionError("A reversão foi executada, mas a restauração não foi confirmada.");
      }
    } catch (error) {
      setActionStatus("applied");
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível reverter a alteração no sandbox.",
      );
    }
  }

  const isInvestigating = state.status === "investigating";

  return (
    <section className="investigation-section" aria-labelledby="investigation-title">
      <div className="investigation-section__heading">
        <div className="agent-introduction">
          <p className="section-kicker">Carcarah Agent</p>
          <h2 id="investigation-title">Análise do Carcarah</h2>
          <p>
            O Carcarah investiga diferentes causas de perda e propõe uma regra
            de busca apenas quando encontra uma correção segura e suportada.
          </p>
          <div className="agent-route" aria-label="Como o Carcarah investiga">
            <div className="agent-route__heading">
              <strong>Como o Carcarah investiga</strong>
              <span>O agente irá</span>
            </div>
            <ol>
              <li>Métricas da busca</li>
              <li>Resultado atual</li>
              <li>Catálogo</li>
              <li>Produtos</li>
              <li>Diagnóstico</li>
              <li>Aprovação + validação</li>
            </ol>
          </div>
          <p className="agent-mvp-limit">
            Neste MVP, ações executáveis são limitadas a regras seguras de busca
            no sandbox.
          </p>
        </div>
        <button
          className="investigate-button"
          disabled={!agentConfigured || isInvestigating}
          onClick={investigate}
          type="button"
        >
          {isInvestigating
            ? "Investigando..."
            : state.status === "completed" || state.status === "error"
              ? "Investigar novamente"
              : "Investigar com Carcarah"}
        </button>
      </div>

      {!agentConfigured ? (
        <div className="agent-notice" role="status">
          O agente ainda não está configurado. Adicione <code>OPENAI_API_KEY</code>
          para habilitar uma investigação real.
        </div>
      ) : null}

      <div aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {isInvestigating ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="investigation-progress"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key="investigating"
              role="status"
            >
              <span className="investigation-progress__dot" aria-hidden="true" />
              <div>
                <strong>Carcarah está investigando</strong>
                <p>
                  Consultando a operação e reunindo evidências antes de
                  recomendar uma alteração.
                </p>
              </div>
            </motion.div>
          ) : null}

          {state.status === "error" ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="investigation-error"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: 6 }}
              key="error"
              role="alert"
            >
              <strong>Falha na investigação</strong>
              <p>{state.message}</p>
            </motion.div>
          ) : null}

          {state.status === "completed" ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 12 }}
              key="completed"
            >
              <InvestigationReport
                actionError={actionError}
                actionStatus={actionStatus}
                onApply={applyInSandbox}
                onRevert={revertSandboxChange}
                resolution={resolution}
                response={state.data}
                revertResult={revertResult}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
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
      <p className="investigation-report__kicker">Resultado da investigação</p>
      <AgentTrace trace={trace} />

      {trace.length > 0 ? <AgentFlowConnector /> : null}

      <section className="agent-evidence" aria-labelledby="agent-evidence-title">
        <p className="agent-stage-label">Evidências coletadas</p>
        <h3 id="agent-evidence-title">O que as ferramentas observaram</h3>
        <ol className="evidence-list">
          {investigation.evidence.map((item, index) => (
            <li key={`${item.type}-${index}`}>
              <span>{evidenceLabels[item.type]}</span>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>

        {investigation.relatedProducts.length > 0 ? (
          <div className="related-products">
            <h3>Produtos relacionados encontrados</h3>
            <div className="related-products__grid">
              {investigation.relatedProducts.map((product) => (
                <article key={product.id}>
                  <span>{product.id}</span>
                  <strong>{product.name}</strong>
                  <p>
                    {formatCurrency.format(product.price)}, {product.stock} em
                    estoque
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AgentFlowConnector />

      <section
        className="investigation-report__diagnosis"
        aria-labelledby="agent-diagnosis-title"
      >
        <p className="agent-stage-label">Causa identificada</p>
        <div className="agent-cause">
          <strong>{rootCauseLabels[investigation.rootCause]}</strong>
          <span>{confidenceLabel(investigation.confidence)} de confiança</span>
          <span>Risco {riskLabels[investigation.risk].toLowerCase()}</span>
        </div>
        <p className="agent-conclusion">
          Conclusão do agente baseada nas evidências acima.
        </p>
        <h3 id="agent-diagnosis-title">Diagnóstico</h3>
        <p>{investigation.diagnosis}</p>
      </section>

      <AgentFlowConnector />

      <section
        className="agent-decision"
        aria-labelledby="agent-decision-title"
      >
        <p className="agent-stage-label">Ação proposta</p>
        <h3 id="agent-decision-title">Ação proposta pelo Carcarah</h3>
        <div className="recommendation-card">
          <strong>{actionLabels[recommendation.action]}</strong>
          {approval ? (
            <ExecutableProposal approval={approval} />
          ) : recommendation.action === "boost_products" ? (
            <p>Ajustes de ordenação não são executados neste MVP.</p>
          ) : (
            <p>O Carcarah não encontrou uma regra de busca segura para aplicar.</p>
          )}
          <span>
            Nada muda sem aprovação humana. Neste MVP, o sandbox executa apenas
            regras seguras de busca.
          </span>
        </div>

        <AgentHumanHandoff
          actionStatus={actionStatus}
          approvalRequired={Boolean(approval)}
        />

        {approval && !resolution ? (
          <ApprovalControl
            actionError={actionError}
            actionStatus={actionStatus}
            approval={approval}
            onApply={onApply}
          />
        ) : null}
      </section>

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

function AgentFlowConnector() {
  return (
    <div className="agent-flow-connector" aria-hidden="true">
      <span>↓</span>
    </div>
  );
}

function AgentHumanHandoff({
  actionStatus,
  approvalRequired,
}: {
  actionStatus: ActionStatus;
  approvalRequired: boolean;
}) {
  const approvalReceived = actionStatus !== "idle";
  const activeAgentStatus =
    actionStatus === "applying"
      ? "Aplicando e validando..."
      : actionStatus === "reverting"
        ? "Revertendo a alteração..."
        : actionStatus === "applied"
          ? "Aplicou e validou no sandbox ✓"
          : actionStatus === "reverted"
            ? "Reversão confirmada ✓"
            : null;

  return (
    <div className="agent-human-handoff" aria-label="Separação entre agente e humano">
      <div>
        <span>Carcarah</span>
        <ul>
          <li>Investigou ✓</li>
          <li>Diagnosticou ✓</li>
          <li>
            {approvalRequired
              ? "Propôs uma ação ✓"
              : "Concluiu sem ação executável ✓"}
          </li>
          {activeAgentStatus ? (
            <li className="agent-human-handoff__active">{activeAgentStatus}</li>
          ) : null}
        </ul>
      </div>
      <div>
        <span>Humano</span>
        <strong>
          {approvalRequired
            ? approvalReceived
              ? "Aprovação recebida ✓"
              : "Aprovação necessária"
            : "Nenhuma aprovação necessária"}
        </strong>
      </div>
    </div>
  );
}

function ExecutableProposal({ approval }: { approval: SearchActionApproval }) {
  const { proposal } = approval;
  return (
    <div className="executable-proposal">
      <dl>
        <div>
          <dt>Regra executável</dt>
          <dd>{proposalTypeLabels[proposal.type]}</dd>
        </div>
        <div>
          <dt>Escopo</dt>
          <dd>Sandbox de demonstração</dd>
        </div>
      </dl>
      <div className="rule-mapping" aria-label="Mapeamento recomendado">
        <code>{proposal.source}</code>
        <span aria-hidden="true">↓</span>
        <div>
          {proposal.targets.map((target) => (
            <code key={target}>{target}</code>
          ))}
        </div>
      </div>
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
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`approval-control approval-control--${risk}`}
      initial={{ opacity: 0, y: 8 }}
    >
      <strong>Aprovação humana</strong>
      <p>
        {actionStatus === "applying"
          ? "O Carcarah recebeu a aprovação e está aplicando e validando a alteração no sandbox."
          : risk === "low"
            ? "O Carcarah concluiu a investigação e propôs uma alteração de baixo risco."
          : risk === "medium"
            ? "Esta alteração exige atenção. Revise a regra antes de testá-la."
            : "Esta alteração foi bloqueada pela política de segurança."}
      </p>
      <button
        className="sandbox-apply-button"
        disabled={blocked || actionStatus === "applying"}
        onClick={() => onApply(approval)}
        type="button"
      >
        {actionStatus === "applying"
          ? "Aplicando no sandbox..."
          : blocked
            ? "Aplicação bloqueada"
            : "Aprovar e aplicar no sandbox"}
      </button>
      <small>Nenhuma alteração é executada sem aprovação.</small>
      {actionError ? <p className="action-inline-error">{actionError}</p> : null}
    </motion.div>
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
  const reverted =
    actionStatus === "reverted" && Boolean(revertResult?.revertConfirmed);
  const displayedTrace = reverted && revertResult ? revertResult.trace : resolution.trace;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="sandbox-result-title"
      className="sandbox-resolution"
      initial={{ opacity: 0, y: 16 }}
    >
      <div className="sandbox-resolution__heading">
        <div>
          <p className="section-kicker">Corrigir + validar</p>
          <h3 id="sandbox-result-title">
            {validation.validationPassed
              ? "Problema de busca corrigido no sandbox"
              : "A validação do sandbox não foi aprovada"}
          </h3>
        </div>
        <span className="sandbox-scope">Apenas sandbox de demonstração</span>
      </div>

      <div className="before-after">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="search-state search-state--before"
          initial={{ opacity: 0, x: -10 }}
        >
          <span>Antes</span>
          <h4>{resolution.query}</h4>
          <div className="search-result-count">
            <strong>{validation.before.resultCount}</strong>
            <p>
              {validation.before.resultCount === 1
                ? "produto encontrado"
                : "produtos encontrados"}
            </p>
          </div>
        </motion.div>

        <div className="before-after__bridge">
          <span>Ação do Carcarah</span>
          <div className="applied-rule">
            <code>{resolution.change.source}</code>
            <strong aria-hidden="true">→</strong>
            <div>
              {resolution.change.targets.map((target) => (
                <code key={target}>{target}</code>
              ))}
            </div>
          </div>
          <small>Regra aplicada pelo agente após aprovação.</small>
        </div>

        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="search-state search-state--after"
          initial={{ opacity: 0, x: 10 }}
          transition={{ delay: 0.08 }}
        >
          <span>Depois</span>
          <h4>{resolution.query}</h4>
          <div className="search-result-count search-result-count--success">
            <strong>{validation.after.resultCount}</strong>
            <p>
              {validation.after.resultCount === 1
                ? "produto encontrado"
                : "produtos encontrados"}
            </p>
          </div>
          <div className="resolved-products">
            {resolution.afterProducts.map((product, index) => (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 6 }}
                key={product.id}
                transition={{ delay: 0.12 + index * 0.04 }}
              >
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.stock} em estoque</span>
                </div>
                <p>{formatCurrency.format(product.price)}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="validation-summary">
        <div>
          <span>Oportunidade estimada de GMV</span>
          <strong>
            {formatCurrency.format(resolution.estimatedMonthlyOpportunityAddressed)}
            /mês
          </strong>
          <p>
            Potencial associado a esta busca após a correção no sandbox.
          </p>
        </div>
        <div>
          <span>Verificação de regressões</span>
          <strong>
            {validation.regressionDetected
              ? "Uma busca relacionada foi prejudicada"
              : "Nenhuma busca saudável foi prejudicada"}
          </strong>
          <p>
            {validation.regressionChecks.length}{" "}
            {validation.regressionChecks.length === 1
              ? "busca relacionada verificada."
              : "buscas relacionadas verificadas."}
          </p>
        </div>
      </div>

      <ActionTrace
        regressionDetected={validation.regressionDetected}
        resultCount={validation.after.resultCount}
        revertConfirmed={Boolean(revertResult?.revertConfirmed)}
        trace={displayedTrace}
      />

      <div className="revert-control">
        {actionStatus === "applied" && !reverted ? (
          <Link
            className="storefront-link"
            href={`/storefront?q=${encodeURIComponent(resolution.query)}&autosearch=1`}
          >
            Ver resultado na loja →
          </Link>
        ) : null}
        <AnimatePresence initial={false} mode="wait">
          {reverted && revertResult ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="revert-confirmation"
              initial={{ opacity: 0, y: 6 }}
              key="reverted"
              role="status"
            >
              <strong>Alteração revertida</strong>
              <p>Comportamento original da busca restaurado.</p>
            </motion.div>
          ) : (
            <motion.button
              className="revert-button"
              disabled={actionStatus === "reverting"}
              key="revert-button"
              onClick={() => onRevert(approval)}
              type="button"
              whileTap={{ scale: 0.985 }}
            >
              {actionStatus === "reverting"
                ? "Revertendo alteração..."
                : "Reverter alteração"}
            </motion.button>
          )}
        </AnimatePresence>
        {actionError ? <p className="action-inline-error">{actionError}</p> : null}
      </div>
    </motion.section>
  );
}

function AgentTrace({ trace }: { trace: InvestigationTraceEvent[] }) {
  const activity = buildAgentActivity(trace);
  if (activity.length === 0) return null;

  return (
    <section className="agent-trace" aria-labelledby="agent-activity-title">
      <header className="agent-trace__heading">
        <p className="agent-stage-label">Atividade do agente</p>
        <h3 id="agent-activity-title">
          {activity.length}{" "}
          {activity.length === 1
            ? "ferramenta executada"
            : "ferramentas executadas"}
        </h3>
        <p>Chamadas retornadas pelo runtime desta investigação.</p>
      </header>
      <ol>
        {activity.map((item, index) => (
          <li key={`${item.tool}-${index}`}>
            <span className="agent-trace__check" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>{item.label}</strong>
              <code>{item.tool}</code>
              <p>{item.summary}</p>
              {item.terms.length > 0 ? (
                <div
                  className="agent-trace__terms"
                  aria-label="Termos pesquisados"
                >
                  {item.terms.map((term) => (
                    <code key={term}>{term}</code>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ActionTraceProps {
  trace: ActionTraceEvent[];
  resultCount: number;
  regressionDetected: boolean;
  revertConfirmed: boolean;
}

function actionTraceLabel(
  event: ActionTraceEvent,
  resultCount: number,
  regressionDetected: boolean,
  revertConfirmed: boolean,
): string {
  const labels: Record<ActionTraceEvent["step"], string> = {
    human_approval: "Aprovação humana recebida",
    rule_validated: "Regra validada",
    sandbox_applied: "Alteração aplicada no sandbox",
    query_retested: "Busca original executada novamente",
    results_measured: `${resultCount} ${
      resultCount === 1 ? "produto recuperado" : "produtos recuperados"
    }`,
    regression_checked: regressionDetected
      ? "Regressão detectada"
      : "Nenhuma regressão detectada",
    sandbox_reconstructed: "Estado do sandbox reconstruído",
    sandbox_reverted: "Alteração removida do sandbox",
    original_behavior_restored: revertConfirmed
      ? "Comportamento original restaurado"
      : "Restauração ainda não confirmada",
  };

  return labels[event.step];
}

function ActionTrace({
  trace,
  resultCount,
  regressionDetected,
  revertConfirmed,
}: ActionTraceProps) {
  if (trace.length === 0) return null;

  return (
    <section className="action-trace" aria-labelledby="agent-validation-title">
      <header className="action-trace__heading">
        <p className="agent-stage-label">Validação do agente</p>
        <h3 id="agent-validation-title">
          {trace.length} operações verificadas
        </h3>
      </header>
      <ol>
        {trace.map((event, index) => (
          <li key={`${event.step}-${index}`}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>
                {actionTraceLabel(
                  event,
                  resultCount,
                  regressionDetected,
                  revertConfirmed,
                )}
              </strong>
              <code>{event.step}</code>
              <p>{event.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
