"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Gap, Priority } from "@/lib/types";

interface EditGapModalProps {
  gap: Gap;
  onClose: () => void;
}

export default function EditGapModal({ gap, onClose }: EditGapModalProps) {
  const { updateGap } = useStore();
  const [title, setTitle] = useState(gap.title);
  const [description, setDescription] = useState(gap.description);
  const [category, setCategory] = useState(gap.category);
  const [priority, setPriority] = useState<Priority>(gap.priority);
  const [skills, setSkills] = useState(gap.skills.join("، "));
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Same authoritative re-entrancy guard used by AddGapModal/AddProjectModal
  // /CompleteProjectModal: a ref mutates synchronously so a fast second
  // submit sees the updated value immediately, unlike isSubmitting state.
  const isSubmittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await updateGap(gap.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || "عام",
        priority,
        skills: skills
          .split("،")
          .join(",")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-panel2 border border-line rounded-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-textDim hover:text-text"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>
        <h2 className="font-display text-xl mb-5">تعديل الثغر</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-textDim mb-1.5">عنوان الثغر</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-textDim mb-1.5">التصنيف</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-textDim mb-1.5">الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              >
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="normal">عادية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-textDim mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-textDim mb-1.5">
              المهارات المطلوبة (افصل بفاصلة)
            </label>
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold text-bgDeep font-bold rounded-lg py-2.5 hover:bg-goldBright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </form>
      </div>
    </div>
  );
}
