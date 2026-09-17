import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuth";
import { errorResponse } from "@/lib/api/errors";
import { promoteToBook } from "@/lib/services/gapService";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const gap = await promoteToBook(params.id, user);
    return NextResponse.json(gap);
  } catch (err) {
    return errorResponse(err);
  }
}
