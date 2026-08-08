import { z } from "zod";

const synonymRuleSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    source: z.string().trim().min(1).max(160),
    targets: z.array(z.string().trim().min(1).max(160)).min(1).max(6),
    reversible: z.literal(true),
  })
  .strict();

const queryRewriteRuleSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    source: z.string().trim().min(1).max(160),
    targets: z.array(z.string().trim().min(1).max(160)).min(1).max(6),
    reversible: z.literal(true),
  })
  .strict();

export const searchConfigurationSchema = z
  .object({
    synonymRules: z.array(synonymRuleSchema).max(20),
    queryRewriteRules: z.array(queryRewriteRuleSchema).max(20),
  })
  .strict();

export const storefrontSearchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
    configuration: searchConfigurationSchema.optional(),
  })
  .strict();
