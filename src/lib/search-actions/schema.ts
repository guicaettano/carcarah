import { z } from "zod";

export const searchActionProposalSchema = z
  .object({
    type: z.enum(["query_rewrite", "synonym_rule"]),
    source: z.string().trim().min(1).max(160),
    targets: z.array(z.string().trim().min(1).max(160)).min(1).max(6),
    scope: z.literal("demo_storefront"),
    confidence: z.number().min(0).max(1),
    risk: z.enum(["low", "medium", "high"]),
    reversible: z.literal(true),
    rationale: z.string().trim().min(1).max(800),
  })
  .strict();

export const resolveRequestSchema = z
  .object({
    operation: z.enum(["apply", "revert"]),
    query: z.string().trim().min(1).max(200),
    proposal: searchActionProposalSchema,
    approvalToken: z.string().min(20),
    ruleId: z.string().min(1).nullable().optional(),
  })
  .strict();
