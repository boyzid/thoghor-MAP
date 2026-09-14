import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { parseJson } from "@/lib/api/validate";
import { errorResponse } from "@/lib/api/errors";
import { updateGapSchema } from "@/lib/api/schemas";
import { getPublicGapById, updateGap } from "@/lib/services/gapService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const gap = await getPublicGapById(params.id);
    return NextResponse.json(gap);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, updateGapSchema);

    const gap = await updateGap(params.id, data, user);
    return NextResponse.json(gap);
  } catch (err) {
    return errorResponse(err);
  }
}
