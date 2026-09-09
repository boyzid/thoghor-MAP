import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { parseJson } from "@/lib/api/validate";
import { errorResponse, ConflictError, ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { completeProjectSchema } from "@/lib/api/schemas";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const data = await parseJson(req, completeProjectSchema);

    const project = await prisma.project.findUnique({ where: { id: params.id } });
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Ownership check happens against the DB-stored creatorId — never a
    // client-supplied value. A project with no creator (created before
    // authentication existed) can only be completed by an admin.
    const isOwner = project.creatorId !== null && project.creatorId === user.id;
    if (!isOwner && user.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    const final = await prisma.$transaction(async (tx) => {
      // Atomic concurrency gate: this UPDATE only matches (and only one
      // concurrent transaction can ever see status still "ACTIVE" thanks to
      // Postgres row-level locking + WHERE re-evaluation on unblock) if the
      // project has not already been completed. A losing racing transaction
      // gets count 0 here and must stop before writing any Result/Lesson rows.
      const transition = await tx.project.updateMany({
        where: { id: project.id, status: "ACTIVE" },
        data: { status: "COMPLETED" },
      });

      if (transition.count === 0) {
        throw new ConflictError("Project already completed");
      }

      await tx.result.createMany({
        data: [
          { projectId: project.id, title: "الإنجازات", description: data.achievements },
          { projectId: project.id, title: "النتائج المحققة", description: data.results },
        ],
      });
      await tx.lesson.create({
        data: { projectId: project.id, title: "الدروس المستفادة", description: data.lessonsLearned },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { results: true, lessons: true },
      });
    });

    return NextResponse.json(final);
  } catch (err) {
    return errorResponse(err);
  }
}
