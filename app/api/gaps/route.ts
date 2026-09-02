import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gaps = await prisma.gap.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(gaps);
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.title || !body?.description || !body?.priority) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const gap = await prisma.gap.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category || "عام",
        priority: body.priority,
        skills: Array.isArray(body.skills) ? body.skills : [],
      },
    });
    return NextResponse.json(gap, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Database unavailable", message: (err as Error).message },
      { status: 503 }
    );
  }
}
