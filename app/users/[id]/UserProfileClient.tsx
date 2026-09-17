"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, User as UserIcon } from "lucide-react";
import { PRIORITY_LABEL, type Gap } from "@/lib/types";

interface ProfileData {
  id: string;
  name: string | null;
  image: string | null;
  gaps: Gap[];
}

export default function UserProfileClient({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}`)
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("تعذّر تحميل الملف الشخصي");
        return (await res.json()) as ProfileData;
      })
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (profile === undefined) {
    return <div className="max-w-3xl mx-auto px-5 py-16 text-center text-textDim">جارٍ التحميل...</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-textDim">
        لم يُعثر على هذا المستخدم.
        <div className="mt-4">
          <Link href="/" className="text-gold hover:underline">
            العودة إلى لوحة الثغور
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-textDim hover:text-gold mb-6"
      >
        <ArrowRight size={16} />
        العودة إلى لوحة الثغور
      </Link>

      <div className="bg-panel border border-line rounded-xl p-6 mb-8 flex items-center gap-4">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt={profile.name ?? "مستخدم"}
            className="w-14 h-14 rounded-full object-cover border border-line"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-bgDeep border border-line flex items-center justify-center text-textDim">
            <UserIcon size={22} />
          </div>
        )}
        <div>
          <h1 className="font-display text-xl">{profile.name ?? "مستخدم"}</h1>
          <p className="text-xs text-textDim">{profile.gaps.length} مساهمة في الثغور</p>
        </div>
      </div>

      <h2 className="font-display text-lg mb-4">الثغور المساهم بها</h2>

      {profile.gaps.length === 0 ? (
        <div className="text-center py-14 text-textDim text-sm border border-dashed border-line rounded-xl">
          لا توجد مساهمات بعد.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {profile.gaps.map((gap) => (
            <Link
              key={gap.id}
              href={`/gaps/${gap.id}`}
              className="block bg-panel border border-line rounded-xl p-5 hover:border-line/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`badge badge-priority-${gap.priority}`}>
                  {PRIORITY_LABEL[gap.priority]}
                </span>
                <span
                  className={`badge ${gap.source === "BOOK" ? "badge-source-book" : "badge-source-community"}`}
                >
                  {gap.source === "BOOK" ? "📖 اعتُمد في الكتاب" : "👤 مجتمعي"}
                </span>
              </div>
              <h3 className="font-display text-base mb-1">{gap.title}</h3>
              <p className="text-xs text-textDim">{gap.category}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
