import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { parseJson } from "@/lib/api/validate";
import { errorResponse } from "@/lib/api/errors";
import { createGapSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    const gaps = await prisma.gap.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(gaps);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, createGapSchema);

    const gap = await prisma.gap.create({
      data: { ...data, creatorId: user.id },
    });
    return NextResponse.json(gap, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
