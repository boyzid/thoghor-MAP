"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/types";
import CompleteProjectModal from "@/app/components/modals/CompleteProjectModal";

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { getProject, getGap, loading } = useStore();
  const { data: session } = useSession();
  const project = getProject(projectId);
  const [showComplete, setShowComplete] = useState(false);

  const canComplete =
    !!session?.user &&
    (session.user.role === "ADMIN" ||
      (project?.creatorId !== null && project?.creatorId === session.user.id));

  if (loading) {
    return <div className="max-w-3xl mx-auto px-5 py-16 text-center text-textDim">جارٍ التحميل...</div>;
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-textDim">
        لم يُعثر على هذا المشروع.
        <div className="mt-4">
          <Link href="/" className="text-gold hover:underline">
            العودة إلى لوحة الثغور
          </Link>
        </div>
      </div>
    );
  }

  const gap = getGap(project.gapId);

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {gap && (
        <Link
          href={`/gaps/${gap.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-textDim hover:text-gold mb-6"
        >
          <ArrowRight size={16} />
          العودة إلى ثغر: {gap.title}
        </Link>
      )}

      <div className="bg-panel border border-line rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`badge badge-status-${
              project.status === "ACTIVE" ? "active" : "completed"
            }`}
          >
            {STATUS_LABEL[project.status]}
          </span>
          <span className="text-xs text-textDim">{project.country}</span>
        </div>
        <h1 className="font-display text-2xl mb-2">{project.title}</h1>
        <p className="text-sm text-textDim mb-1">بواسطة: {project.owner}</p>
        <p className="text-sm text-textDim mb-4">{project.summary}</p>

        {project.status === "ACTIVE" && (
          <div className="flex items-center gap-3 mt-4">
            {project.contact && (
              <a
                href={project.contact}
                className="inline-flex items-center gap-1.5 text-sm bg-gold text-bgDeep font-bold rounded-lg px-4 py-2 hover:bg-goldBright transition-colors"
              >
                <Mail size={15} />
                تواصل للانضمام
              </a>
            )}
            {canComplete && (
              <button
                onClick={() => setShowComplete(true)}
                className="text-sm bg-panel2 border border-line rounded-lg px-4 py-2 hover:border-gold transition-colors"
              >
                إنهاء المشروع وتوثيقه
              </button>
            )}
          </div>
        )}
      </div>

      {project.status === "COMPLETED" && (
        <div className="space-y-5">
          {project.results.map((r) => (
            <div key={r.id} className="bg-panel border border-line rounded-xl p-5">
              <h2 className="flex items-center gap-2 font-display text-lg mb-2 text-gold">
                <span>{r.title === "الإنجازات" ? "📝" : "📊"}</span> {r.title}
              </h2>
              <p className="text-sm text-textDim leading-relaxed">{r.description}</p>
            </div>
          ))}

          {project.lessons.map((l) => (
            <div key={l.id} className="bg-panel border border-line rounded-xl p-5">
              <h2 className="flex items-center gap-2 font-display text-lg mb-2 text-goldBright">
                <span>💡</span> {l.title}
              </h2>
              <p className="text-sm text-textDim leading-relaxed">{l.description}</p>
            </div>
          ))}
        </div>
      )}

      {showComplete && (
        <CompleteProjectModal
          projectId={project.id}
          onClose={() => setShowComplete(false)}
        />
      )}
    </div>
  );
}
