"use client";

import { Priority, PRIORITY_LABEL } from "@/lib/types";

interface FilterBarProps {
  categories: string[];
  category: string;
  onCategoryChange: (value: string) => void;
  priority: Priority | "all";
  onPriorityChange: (value: Priority | "all") => void;
  skill: string;
  onSkillChange: (value: string) => void;
}

export default function FilterBar({
  categories,
  category,
  onCategoryChange,
  priority,
  onPriorityChange,
  skill,
  onSkillChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="bg-panel border border-line rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold"
      >
        <option value="all">كل التصنيفات</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value as Priority | "all")}
        className="bg-panel border border-line rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold"
      >
        <option value="all">كل الأولويات</option>
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      <input
        value={skill}
        onChange={(e) => onSkillChange(e.target.value)}
        placeholder="فلترة حسب مهارة (مثال: كتابة)"
        className="bg-panel border border-line rounded-lg px-3 py-2 text-sm text-text placeholder:text-textDim focus:outline-none focus:border-gold flex-1 min-w-[200px]"
      />
    </div>
  );
}
