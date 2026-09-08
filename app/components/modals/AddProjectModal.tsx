"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";

interface AddProjectModalProps {
  gapId: string;
  onClose: () => void;
}

export default function AddProjectModal({ gapId, onClose }: AddProjectModalProps) {
  const { addProject } = useStore();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [country, setCountry] = useState("");
  const [contact, setContact] = useState("");
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Authoritative re-entrancy guard: a ref mutates synchronously, so a second
  // invocation of handleSubmit (fast double-click, repeated Enter, etc.) sees
  // the updated value immediately — unlike isSubmitting state, whose update
  // is not visible until the next render.
  const isSubmittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !owner.trim()) return;
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await addProject({
        gapId,
        title: title.trim(),
        owner: owner.trim(),
        country: country.trim() || "غير محدد",
        contact: contact.trim() || undefined,
        summary: summary.trim(),
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
        <h2 className="font-display text-xl mb-5">إضافة مشروع جديد تحت هذا الثغر</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-textDim mb-1.5">عنوان المشروع</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              placeholder="اسم المشروع أو المبادرة"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-textDim mb-1.5">اسم المنشئ / الفريق</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                placeholder="اسمك أو اسم فريقك"
              />
            </div>
            <div>
              <label className="block text-xs text-textDim mb-1.5">الدولة</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                placeholder="مثال: المغرب"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-textDim mb-1.5">
              وسيلة تواصل (اختياري)
            </label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              placeholder="بريد إلكتروني أو رابط"
            />
          </div>

          <div>
            <label className="block text-xs text-textDim mb-1.5">وصف مختصر</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full bg-bgDeep border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none"
              placeholder="ماذا يفعل هذا المشروع؟"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold text-bgDeep font-bold rounded-lg py-2.5 hover:bg-goldBright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "جارٍ الحفظ..." : "حفظ المشروع"}
          </button>
        </form>
      </div>
    </div>
  );
}
