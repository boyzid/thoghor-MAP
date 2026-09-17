import { NextResponse } from "next/server";
import { GapSource } from "@prisma/client";
import { requireUser } from "@/lib/serverAuth";
import { parseJson } from "@/lib/api/validate";
import { errorResponse } from "@/lib/api/errors";
import { createGapSchema } from "@/lib/api/schemas";
import { listPublicGaps, createGap } from "@/lib/services/gapService";

function parseSourceParam(value: string | null): GapSource | undefined {
  return value === GapSource.BOOK || value === GapSource.COMMUNITY ? value : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gaps = await listPublicGaps({
      source: parseSourceParam(searchParams.get("source")),
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(gaps);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, createGapSchema);

    const gap = await createGap(data, user);
    return NextResponse.json(gap, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
