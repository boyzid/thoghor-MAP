import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/serverAuth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  if (!body?.achievements || !body?.results || !body?.lessonsLearned) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: params.id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ownership check happens against the DB-stored creatorId — never a
    // client-supplied value. A project with no creator (created before
    // authentication existed) can only be completed by an admin.
    const isOwner = project.creatorId !== null && project.creatorId === user.id;
    if (!isOwner && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const final = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: { status: "COMPLETED" },
      });
      await tx.result.createMany({
        data: [
          { projectId: project.id, title: "الإنجازات", description: body.achievements },
          { projectId: project.id, title: "النتائج المحققة", description: body.results },
        ],
      });
      await tx.lesson.create({
        data: { projectId: project.id, title: "الدروس المستفادة", description: body.lessonsLearned },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { results: true, lessons: true },
      });
    });

    return NextResponse.json(final);
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}
