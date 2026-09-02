"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import { PRIORITY_LABEL } from "@/lib/types";
import AddProjectModal from "@/app/components/modals/AddProjectModal";

export default function GapDetailClient({ gapId }: { gapId: string }) {
  const { getGap, getProjectsForGap } = useStore();
  const gap = getGap(gapId);
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [country, setCountry] = useState("all");
  const [showAddProject, setShowAddProject] = useState(false);

  const allProjects = gap ? getProjectsForGap(gap.id) : [];

  const countries = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.country))),
    [allProjects]
  );

  const visibleProjects = useMemo(() => {
    return allProjects.filter(
      (p) => p.status === tab && (country === "all" || p.country === country)
    );
  }, [allProjects, tab, country]);

  if (!gap) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-textDim">
        لم يُعثر على هذا الثغر.
        <div className="mt-4">
          <Link href="/" className="text-gold hover:underline">
            العودة إلى لوحة الثغور
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-textDim hover:text-gold mb-6"
      >
        <ArrowRight size={16} />
        العودة إلى لوحة الثغور
      </Link>

      <div className="bg-panel border border-line rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className={`badge badge-priority-${gap.priority}`}>
            {PRIORITY_LABEL[gap.priority]}
          </span>
          <span className="text-xs text-textDim">{gap.category}</span>
        </div>
        <h1 className="font-display text-2xl mb-3">{gap.title}</h1>
        <p className="text-sm text-textDim mb-4">{gap.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {gap.skills.map((s) => (
            <span
              key={s}
              className="text-[11px] bg-bgDeep border border-line text-textDim px-2 py-1 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("ACTIVE")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "ACTIVE"
                ? "bg-gold text-bgDeep"
                : "bg-panel border border-line text-textDim hover:text-text"
            }`}
          >
            المشاريع النشطة
          </button>
          <button
            onClick={() => setTab("COMPLETED")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "COMPLETED"
                ? "bg-gold text-bgDeep"
                : "bg-panel border border-line text-textDim hover:text-text"
            }`}
          >
            المشاريع المنتهية
          </button>
        </div>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
        >
          <option value="all">كل الدول</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="text-center py-14 text-textDim text-sm border border-dashed border-line rounded-xl mb-8">
          {tab === "ACTIVE"
            ? "لا توجد مشاريع نشطة على هذا الثغر بعد. كن أول من ينشئ واحدًا."
            : "لا توجد مشاريع منتهية موثّقة على هذا الثغر بعد."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {visibleProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block bg-panel border border-line rounded-xl p-5 hover:border-line/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`badge badge-status-${
                    p.status === "ACTIVE" ? "active" : "completed"
                  }`}
                >
                  {p.status === "ACTIVE" ? "نشط" : "منتهٍ"}
                </span>
                <span className="text-xs text-textDim">{p.country}</span>
              </div>
              <h3 className="font-display text-base mb-1">{p.title}</h3>
              <p className="text-xs text-textDim mb-3">{p.owner}</p>
              <p className="text-sm text-textDim line-clamp-2">{p.summary}</p>
              {p.status === "ACTIVE" && p.contact && (
                <div className="flex items-center gap-1.5 text-xs text-gold mt-3">
                  <Mail size={13} />
                  للتواصل والانضمام
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAddProject(true)}
        className="bg-gold text-bgDeep font-bold rounded-lg px-5 py-2.5 hover:bg-goldBright transition-colors"
      >
        + إضافة مشروع جديد تحت هذا الثغر
      </button>

      {showAddProject && (
        <AddProjectModal gapId={gap.id} onClose={() => setShowAddProject(false)} />
      )}
    </div>
  );
}
