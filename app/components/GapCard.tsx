import Link from "next/link";
import { Gap, PRIORITY_LABEL } from "@/lib/types";
import { Users } from "lucide-react";

interface GapCardProps {
  gap: Gap;
  projectsCount: number;
}

export default function GapCard({ gap, projectsCount }: GapCardProps) {
  return (
    <Link
      href={`/gaps/${gap.id}`}
      className="block bg-panel border border-line rounded-xl p-5 hover:border-line/60 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`badge badge-priority-${gap.priority}`}>
          {PRIORITY_LABEL[gap.priority]}
        </span>
        <span className="text-xs text-textDim">{gap.category}</span>
      </div>

      <h3 className="font-display text-lg text-text mb-2 leading-snug">{gap.title}</h3>
      <p className="text-sm text-textDim mb-4 line-clamp-3">{gap.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {gap.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[11px] bg-bgDeep border border-line text-textDim px-2 py-1 rounded"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-textDim border-t border-line pt-3">
        <Users size={14} />
        <span>{projectsCount} مشروع مرتبط بهذا الثغر</span>
      </div>
    </Link>
  );
}
