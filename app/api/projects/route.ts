import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { parseJson } from "@/lib/api/validate";
import { errorResponse, NotFoundError } from "@/lib/api/errors";
import { createProjectSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { results: true, lessons: true },
    });
    return NextResponse.json(projects);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, createProjectSchema);

    const gap = await prisma.gap.findUnique({
      where: { id: data.gapId },
      select: { id: true },
    });
    if (!gap) {
      throw new NotFoundError("Gap not found");
    }

    const project = await prisma.project.create({
      data: {
        gapId: data.gapId,
        title: data.title,
        owner: data.owner,
        country: data.country,
        contact: data.contact,
        summary: data.summary,
        status: "ACTIVE",
        creatorId: user.id,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
