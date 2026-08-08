# Carcarah × NOVA storefront

This bundle is intentionally isolated from the Carcarah core.

## Integration points

The current search engine already exposes `searchStorefront(query, catalog, config)`, and the current Act/Revert responses already return `configuration: SearchConfiguration`.

### After successful APPLY

In the client that receives `/api/resolve`:

```ts
import { persistDemoSearchConfiguration } from "@/lib/storefront-demo/session";

persistDemoSearchConfiguration(response.configuration);
```

Then show:

```tsx
<Link href={`/storefront?q=${encodeURIComponent(response.query)}&autosearch=1`}>
  Ver resultado na loja
</Link>
```

### After successful REVERT

Persist the `configuration` returned by the revert response too:

```ts
persistDemoSearchConfiguration(response.configuration);
```

This means the storefront reflects the backend-reconstructed sandbox configuration rather than inventing results client-side.

## Security note

This is demo session state, not production authorization. `/api/resolve` remains the approval-protected action. The storefront API validates the config schema and executes the real search engine, but a user could tamper with their own sessionStorage. For a hackathon synthetic storefront this is acceptable; production provenance should use a signed configuration token.

## Expected demo

1. Reset demo.
2. `/storefront` → search `moletom canguru preto` → 0.
3. Go to Carcarah and investigate.
4. Approve and apply.
5. Persist returned configuration.
6. Click **Ver resultado na loja**.
7. Same query runs through the same engine and returns the real matching products.
8. Revert and persist the reverted configuration.
9. Storefront returns to original behavior.

## Before merge

Run `npm run lint`, `npm test`, `npm run build`, then smoke-test the full flow on Vercel.
