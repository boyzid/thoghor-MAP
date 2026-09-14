import { NextResponse } from "next/server";
import { GapSource, GapStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/serverAuth";
import { errorResponse } from "@/lib/api/errors";
import { listAllGapsForAdmin } from "@/lib/services/gapService";

function parseSourceParam(value: string | null): GapSource | undefined {
  return value === GapSource.BOOK || value === GapSource.COMMUNITY ? value : undefined;
}

function parseStatusParam(value: string | null): GapStatus | undefined {
  return value === GapStatus.ACTIVE || value === GapStatus.ARCHIVED ? value : undefined;
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const gaps = await listAllGapsForAdmin(
      {
        status: parseStatusParam(searchParams.get("status")),
        source: parseSourceParam(searchParams.get("source")),
        category: searchParams.get("category") ?? undefined,
        search: searchParams.get("search") ?? undefined,
      },
      user
    );
    return NextResponse.json(gaps);
  } catch (err) {
    return errorResponse(err);
  }
}
