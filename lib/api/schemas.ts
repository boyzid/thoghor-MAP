import { z } from "zod";
import { GapSource, Priority } from "@prisma/client";

function requiredTrimmedString(label: string) {
  return z
    .string(`${label} is required`)
    .trim()
    .min(1, `${label} is required`);
}

// POST /api/gaps
// `source` is only ever honored by gapService.createGap for an ADMIN caller
// (and is required in that case) — it's optional here purely because a
// normal USER's request legitimately omits it; the service never trusts a
// non-admin-supplied source.
export const createGapSchema = z.object({
  title: requiredTrimmedString("title"),
  description: requiredTrimmedString("description"),
  // Matches the existing `body.category || "عام"` default, but trims first
  // so a whitespace-only category also falls back instead of being stored
  // as blank-looking text.
  category: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "عام")),
  priority: z.nativeEnum(Priority),
  skills: z.array(requiredTrimmedString("each skill")).optional().default([]),
  source: z.nativeEnum(GapSource).optional(),
});

// PATCH /api/gaps/[id] — only the fields a Gap creator/admin may edit.
// `.strict()` rejects any other key (source/status/creatorId/id/timestamps)
// with a 400 instead of silently ignoring it, so a client can never even
// attempt to smuggle a protected field through this route.
export const updateGapSchema = z
  .object({
    title: requiredTrimmedString("title").optional(),
    description: requiredTrimmedString("description").optional(),
    category: requiredTrimmedString("category").optional(),
    priority: z.nativeEnum(Priority).optional(),
    skills: z.array(requiredTrimmedString("each skill")).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// POST /api/projects
export const createProjectSchema = z.object({
  gapId: requiredTrimmedString("gapId"),
  title: requiredTrimmedString("title"),
  owner: requiredTrimmedString("owner"),
  country: requiredTrimmedString("country"),
  // Matches the existing `body.contact || null` fallback, trimmed first.
  contact: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  summary: requiredTrimmedString("summary"),
});

// PATCH /api/projects/[id]/complete
export const completeProjectSchema = z.object({
  achievements: requiredTrimmedString("achievements"),
  results: requiredTrimmedString("results"),
  lessonsLearned: requiredTrimmedString("lessonsLearned"),
});
