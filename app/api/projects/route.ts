import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.gapId || !body?.title || !body?.owner || !body?.country || !body?.summary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        gapId: body.gapId,
        title: body.title,
        owner: body.owner,
        country: body.country,
        contact: body.contact || null,
        summary: body.summary,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}
