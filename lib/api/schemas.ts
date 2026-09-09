import { z } from "zod";
import { Priority } from "@prisma/client";

function requiredTrimmedString(label: string) {
  return z
    .string(`${label} is required`)
    .trim()
    .min(1, `${label} is required`);
}

// POST /api/gaps
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
