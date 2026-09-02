import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!body?.achievements || !body?.results || !body?.lessonsLearned) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        achievements: body.achievements,
        results: body.results,
        lessonsLearned: body.lessonsLearned,
      },
    });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable or project not found", message: (err as Error).message },
      { status: 503 }
    );
  }
}
