import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { results: true, lessons: true },
    });
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

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
        creatorId: user.id,
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
