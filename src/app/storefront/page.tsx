import { Suspense } from "react";

import { StorefrontClient } from "./storefront-client";
import styles from "./storefront.module.css";

export default function StorefrontPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<StorefrontSkeleton />}>
        <StorefrontClient />
      </Suspense>
    </main>
  );
}

function StorefrontSkeleton() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>NOVA</span>
        </div>
      </header>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NOVA COLLECTION</p>
        <h1>Encontre o que combina com você.</h1>
      </section>
    </>
  );
}
