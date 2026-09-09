import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthError } from "@/lib/serverAuth";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super("Validation failed");
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// Maps any error thrown/returned inside a route handler to a client-safe
// JSON response. Raw Prisma/driver error text (SQL, constraint names,
// column names) is logged server-side only and never forwarded to the
// client — only the small set of known, intentional error types below
// produce a specific status/message; everything else becomes a generic
// 500 so unexpected failures can never leak implementation details.
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: "Invalid request", issues: err.issues },
      { status: 400 }
    );
  }

  if (err instanceof ZodError) {
    const issues: ValidationIssue[] = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return NextResponse.json({ error: "Invalid request", issues }, { status: 400 });
  }

  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  if (err instanceof ConflictError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[api] Prisma known request error", err.code, err.meta);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Conflicting resource" }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  console.error("[api] Unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
