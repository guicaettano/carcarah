import { z } from "zod";

export const investigationInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
  })
  .strict();

export const evidenceTypeSchema = z.enum([
  "leak_metrics",
  "storefront_results",
  "catalog_search",
  "product_details",
]);

export const investigationResultSchema = z
  .object({
    query: z.string().min(1),
    diagnosis: z.string().min(1).max(1_500),
    rootCause: z.enum([
      "vocabulary_mismatch",
      "ranking_problem",
      "catalog_gap",
      "stock_problem",
      "unknown",
    ]),
    evidence: z
      .array(
        z
          .object({
            type: evidenceTypeSchema,
            description: z.string().min(1).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    relatedProducts: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            price: z.number().nonnegative(),
            stock: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(8),
    recommendation: z
      .object({
        action: z.enum(["create_synonym", "boost_products", "no_action"]),
        sourceTerm: z.string().min(1).nullable(),
        targetTerms: z.array(z.string().min(1)).max(8).nullable(),
      })
      .strict(),
    confidence: z.number().min(0).max(1),
    risk: z.enum(["low", "medium", "high"]),
  })
  .strict();
