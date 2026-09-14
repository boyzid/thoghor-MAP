import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse } from "@/lib/api/errors";
import { archiveGap } from "@/lib/services/gapService";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const gap = await archiveGap(params.id, user);
    return NextResponse.json(gap);
  } catch (err) {
    return errorResponse(err);
  }
}
