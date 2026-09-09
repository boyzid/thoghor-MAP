import type { ZodType } from "zod";
import { ValidationError } from "./errors";

// Parses the request body as JSON and validates it against `schema` in one
// step, throwing a single, uniformly-shaped ValidationError (caught by
// errorResponse) for both malformed JSON and schema failures — callers
// never need their own try/catch or ad hoc "missing field" checks.
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError([{ path: "", message: "Malformed JSON body" }]);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
    );
  }

  return result.data;
}
