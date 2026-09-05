"use client";

import { useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Plus } from "lucide-react";
import Navbar from "./components/Navbar";
import FilterBar from "./components/FilterBar";
import GapCard from "./components/GapCard";
import AddGapModal from "./components/modals/AddGapModal";
import { useStore } from "@/lib/store";
import { Priority } from "@/lib/types";

export default function HomeClient() {
  const { gaps, countProjectsForGap } = useStore();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [skill, setSkill] = useState("");
  const [showAddGap, setShowAddGap] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(gaps.map((g) => g.category))),
    [gaps]
  );

  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      const matchesSearch =
        !search ||
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || g.category === category;
      const matchesPriority = priority === "all" || g.priority === priority;
      const matchesSkill =
        !skill || g.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()));
      return matchesSearch && matchesCategory && matchesPriority && matchesSkill;
    });
  }, [gaps, search, category, priority, skill]);

  return (
    <div className="min-h-screen">
      <Navbar search={search} onSearchChange={setSearch} />

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="font-display text-2xl mb-1">الثغور المحتاجة</h2>
          <p className="text-sm text-textDim">
            كل ثغر هو حاجة قائمة تنتظر من يسدّها. اختر ما يناسب طاقتك.
          </p>
        </div>

        <FilterBar
          categories={categories}
          category={category}
          onCategoryChange={setCategory}
          priority={priority}
          onPriorityChange={setPriority}
          skill={skill}
          onSkillChange={setSkill}
        />

        {filteredGaps.length === 0 ? (
          <div className="text-center py-20 text-textDim text-sm">
            لا توجد ثغور مطابقة لبحثك.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGaps.map((gap) => (
              <GapCard key={gap.id} gap={gap} projectsCount={countProjectsForGap(gap.id)} />
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => (session ? setShowAddGap(true) : signIn("google"))}
        className="fixed bottom-6 right-6 bg-gold text-bgDeep rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-goldBright transition-colors z-40"
        aria-label="إضافة ثغر جديد"
        title={session ? "إضافة ثغر جديد" : "سجّل الدخول لإضافة ثغر"}
      >
        <Plus size={26} />
      </button>

      {showAddGap && <AddGapModal onClose={() => setShowAddGap(false)} />}
    </div>
  );
}
