import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [gapCount, projectCount] = await Promise.all([
      prisma.gap.count(),
      prisma.project.count(),
    ]);
    return NextResponse.json({
      status: "ok",
      db: "connected",
      gaps: gapCount,
      projects: projectCount,
    });
  } catch (err) {
    console.error("[api] /api/health check failed", err);
    return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
