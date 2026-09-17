import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, NotFoundError } from "@/lib/api/errors";
import { listGapsForProfile } from "@/lib/services/gapService";

// Public profile: name/image + Gap contribution history. Contributions are
// creatorId-based (not source-based) so a COMMUNITY gap later promoted to
// BOOK stays visible in the original creator's history — see
// gapService.listGapsForProfile.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, image: true },
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const gaps = await listGapsForProfile(user.id);

    return NextResponse.json({ ...user, gaps });
  } catch (err) {
    return errorResponse(err);
  }
}
