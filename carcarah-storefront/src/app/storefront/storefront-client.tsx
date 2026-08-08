"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { clearDemoSearchConfiguration, readDemoSearchConfiguration } from "../../lib/storefront-demo/session";
import type { StorefrontApiResponse } from "../../lib/storefront-demo/types";
import styles from "./storefront.module.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function StorefrontClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";
  const autoSearch = searchParams.get("autosearch") === "1";
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<StorefrontApiResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const autoSearchStarted = useRef(false);

  const resultLabel = useMemo(() => {
    if (!result) return "";
    return `${result.total} ${result.total === 1 ? "produto encontrado" : "produtos encontrados"}`;
  }, [result]);

  const runSearch = useCallback(async (nextQuery: string) => {
    const normalized = nextQuery.trim();
    if (!normalized) return;
    setStatus("loading");
    setError(null);
    try {
      const configuration = readDemoSearchConfiguration();
      const response = await fetch("/api/storefront-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: normalized, configuration }),
      });
      const payload = await response.json() as StorefrontApiResponse | { error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Não foi possível buscar os produtos.");
      setResult(payload as StorefrontApiResponse);
      setStatus("idle");
      const url = new URL(window.location.href);
      url.searchParams.set("q", normalized);
      url.searchParams.delete("autosearch");
      window.history.replaceState({}, "", url);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Não foi possível buscar os produtos.");
    }
  }, []);

  useEffect(() => {
    if (autoSearch && initialQuery && !autoSearchStarted.current) {
      autoSearchStarted.current = true;
      void runSearch(initialQuery);
    }
  }, [autoSearch, initialQuery, runSearch]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function resetDemo() {
    clearDemoSearchConfiguration();
    setResult(null); setError(null); setStatus("idle");
    const url = new URL(window.location.href);
    url.searchParams.delete("q"); url.searchParams.delete("autosearch");
    window.history.replaceState({}, "", url);
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/storefront">NOVA</Link>
          <nav className={styles.nav} aria-label="Categorias">
            <span>Novidades</span><span>Feminino</span><span>Masculino</span><span>Acessórios</span>
          </nav>
          <button className={styles.reset} onClick={resetDemo} type="button">Reset demo</button>
        </div>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NOVA COLLECTION</p>
        <h1>Encontre o que combina com você.</h1>
        <p>Peças essenciais, formas simples e uma coleção feita para todos os dias.</p>
      </section>

      <section className={styles.searchSection}>
        <form className={styles.searchForm} onSubmit={onSubmit}>
          <label className={styles.srOnly} htmlFor="storefront-search">Buscar produtos</label>
          <input id="storefront-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produtos" autoComplete="off" />
          <button type="submit" aria-label="Buscar" disabled={status === "loading" || query.trim().length === 0}>
            {status === "loading" ? "Buscando..." : "Buscar"}
          </button>
        </form>
        <div className={styles.demoLinkRow}>
          <span>Loja fictícia · dados de demonstração</span>
          <Link href="/">Ver operação no Carcarah →</Link>
        </div>
      </section>

      <section className={styles.results} aria-live="polite">
        {status === "error" && <div className={styles.statePanel}><p>Não foi possível concluir a busca</p><h2>Tente novamente.</h2><p>{error}</p></div>}
        {status !== "error" && !result && (
          <div className={styles.collectionIntro}>
            <div><p className={styles.eyebrow}>CURADORIA NOVA</p><h2>Uma loja comum.<br />Uma busca que precisa funcionar.</h2></div>
            <p>Use a barra acima para explorar o catálogo desta demonstração.</p>
          </div>
        )}
        {result && (
          <>
            <div className={styles.resultHeader}>
              <div><p>Resultados para</p><h2>“{result.query}”</h2></div><strong>{resultLabel}</strong>
            </div>
            {result.total === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyGlyph}>0</span>
                <div><h3>Não encontramos produtos para esta busca.</h3><p>Tente outro termo ou volte para explorar a coleção.</p></div>
              </div>
            ) : (
              <div className={styles.grid}>
                {result.results.map((product, index) => (
                  <article className={styles.productCard} key={product.id}>
                    <div className={styles.productVisual}>
                      <span className={styles.productIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.productCategory}>{product.category}</span>
                      <span className={styles.productMonogram}>NOVA</span>
                    </div>
                    <div className={styles.productInfo}>
                      <div><h3>{product.name}</h3><p>{formatCurrency(product.price)}</p></div>
                      <span>{product.stock} em estoque</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <footer className={styles.footer}><span>NOVA</span><span>Storefront fictícia para demonstração do Carcarah</span></footer>
    </>
  );
}
