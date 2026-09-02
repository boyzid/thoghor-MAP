"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";

interface CompleteProjectModalProps {
  projectId: string;
  onClose: () => void;
}

export default function CompleteProjectModal({
  projectId,
  onClose,
}: CompleteProjectModalProps) {
  const { completeProject } = useStore();
  const [achievements, setAchievements] = useState("");
  const [results, setResults] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!achievements.trim() || !results.trim() || !lessonsLearned.trim()) return;
    completeProject(projectId, {
      achievements: achievements.trim(),
      results: results.trim(),
      lessonsLearned: lessonsLearned.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-panel2 border border-line rounded-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-textDim hover:text-text"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>
        <h2 className="font-display text-xl mb-1">إنهاء المشروع وتوثيقه</h2>
        <p className="text-xs text-textDim mb-5">
          هذه الخطوة تحوّل المشروع من صفحة منتهية إلى مصدر معرفة لمن يأتي بعده.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gold mb-1.5">📝 ماذا فعلنا</label>
            <textarea
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              required
              rows={3}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
              placeholder="الأنشطة وخطوات التنفيذ الفعلية"
            />
          </div>

          <div>
            <label className="block text-xs text-sage mb-1.5">📊 ماذا تحقق</label>
            <textarea
              value={results}
              onChange={(e) => setResults(e.target.value)}
              required
              rows={3}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
              placeholder="النتائج والأثر الملموس"
            />
          </div>

          <div>
            <label className="block text-xs text-goldBright mb-1.5">💡 ماذا تعلمنا</label>
            <textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              required
              rows={3}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
              placeholder="الدروس المستفادة والتوصيات لمن يبدأ مشروعًا مشابهًا"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gold text-bgDeep font-bold rounded-lg py-2.5 hover:bg-goldBright transition-colors"
          >
            حفظ وإنهاء المشروع
          </button>
        </form>
      </div>
    </div>
  );
}
