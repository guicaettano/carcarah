import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { normalizeSearchText } from "../commerce-search";
import { searchActionProposalSchema } from "./schema";
import type { SearchActionApproval, SearchActionProposal } from "./types";

const authorizationPayloadSchema = z
  .object({
    version: z.literal(1),
    query: z.string().min(1),
    proposal: searchActionProposalSchema,
    supportedTerms: z.array(z.string().min(1)).min(1),
    supportedProductIds: z.array(z.string().min(1)).min(1),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type SearchActionAuthorizationPayload = z.infer<
  typeof authorizationPayloadSchema
>;

export class SearchActionAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchActionAuthorizationError";
  }
}

function signingSecret(): string {
  const secret =
    process.env.CARCARAH_APPROVAL_SECRET ?? process.env.OPENAI_API_KEY;
  if (!secret) {
    throw new SearchActionAuthorizationError(
      "Action approval signing is not configured.",
    );
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", signingSecret())
    .update(`carcarah-search-action:${encodedPayload}`)
    .digest("base64url");
}

export function createSearchActionApproval(
  query: string,
  proposal: SearchActionProposal,
  supportedTerms: Iterable<string>,
  supportedProductIds: Iterable<string>,
): SearchActionApproval {
  const payload = authorizationPayloadSchema.parse({
    version: 1,
    query,
    proposal,
    supportedTerms: [...supportedTerms],
    supportedProductIds: [...supportedProductIds],
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return { proposal, token: `${encoded}.${sign(encoded)}` };
}

export function verifySearchActionApproval(
  token: string,
  query: string,
  proposal: SearchActionProposal,
): SearchActionAuthorizationPayload {
  const [encoded, suppliedSignature, ...extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra.length > 0) {
    throw new SearchActionAuthorizationError("Action approval token is invalid.");
  }

  const expected = Buffer.from(sign(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    throw new SearchActionAuthorizationError("Action approval token is invalid.");
  }

  let payload: SearchActionAuthorizationPayload;
  try {
    payload = authorizationPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
  } catch {
    throw new SearchActionAuthorizationError("Action approval token is invalid.");
  }

  if (payload.expiresAt < Date.now()) {
    throw new SearchActionAuthorizationError("Action approval token has expired.");
  }
  if (normalizeSearchText(payload.query) !== normalizeSearchText(query)) {
    throw new SearchActionAuthorizationError(
      "Action approval does not match the requested query.",
    );
  }
  if (JSON.stringify(payload.proposal) !== JSON.stringify(proposal)) {
    throw new SearchActionAuthorizationError(
      "The executable proposal differs from the investigated proposal.",
    );
  }

  return payload;
}
