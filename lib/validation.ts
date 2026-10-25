// Shared Zod validation schemas for API route inputs.
//
// All API routes MUST validate their inputs through these schemas.
// Invalid input returns HTTP 400 with Zod error details.
// This is a mandatory security requirement — not optional.

import { z } from "zod";

export const langSchema = z.enum(["en", "ur"]);

export const querySchema = z.string().max(500).trim();

export const searchQuerySchema = z.object({
  q: querySchema.optional().default(""),
  lang: langSchema.optional().default("en"),
});

export const faqsQuerySchema = z.object({
  lang: langSchema.optional().default("en"),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FAQsQuery = z.infer<typeof faqsQuerySchema>;
