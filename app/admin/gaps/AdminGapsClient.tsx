"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ArchiveRestore, ArrowUpCircle, Archive } from "lucide-react";
import { PRIORITY_LABEL, type Gap } from "@/lib/types";

// Client-side gate is convenience only — every action below hits an
// ADMIN-only API route, and gapService itself re-checks role server-side
// regardless of what this page shows.
export default function AdminGapsClient() {
  const { data: session, status } = useSession();
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/gaps")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json())?.error || "تعذّر تحميل الثغور");
        return res.json();
      })
      .then(setGaps)
      .catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      load();
    }
  }, [status, session, load]);

  async function runAction(gapId: string, path: string) {
    setBusyId(gapId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gaps/${gapId}/${path}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "فشل تنفيذ الإجراء");
      setGaps((prev) => prev?.map((g) => (g.id === gapId ? data : g)) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading") {
    return <div className="max-w-4xl mx-auto px-5 py-16 text-center text-textDim">جارٍ التحميل...</div>;
  }

  if (status !== "authenticated" || session?.user.role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center text-textDim">
        هذه الصفحة مخصصة للمشرفين فقط.
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

      <h1 className="font-display text-2xl mb-6">إدارة الثغور (مشرف)</h1>

      {error && (
        <div className="bg-panel2 border border-line text-sm text-textDim rounded-lg p-3 mb-5">
          {error}
        </div>
      )}

      {!gaps ? (
        <div className="text-center py-16 text-textDim text-sm">جارٍ تحميل الثغور...</div>
      ) : gaps.length === 0 ? (
        <div className="text-center py-16 text-textDim text-sm">لا توجد ثغور بعد.</div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => {
            const busy = busyId === gap.id;
            const canPromote = gap.source === "COMMUNITY" && gap.status === "ACTIVE";
            return (
              <div
                key={gap.id}
                className="bg-panel border border-line rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`badge badge-priority-${gap.priority}`}>
                      {PRIORITY_LABEL[gap.priority]}
                    </span>
                    <span
                      className={`badge ${gap.source === "BOOK" ? "badge-source-book" : "badge-source-community"}`}
                    >
                      {gap.source}
                    </span>
                    <span
                      className={`badge ${gap.status === "ARCHIVED" ? "badge-gap-archived" : "badge-status-active"}`}
                    >
                      {gap.status}
                    </span>
                  </div>
                  <Link href={`/gaps/${gap.id}`} className="font-medium hover:text-gold">
                    {gap.title}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {gap.status === "ACTIVE" ? (
                    <button
                      onClick={() => runAction(gap.id, "archive")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-xs bg-panel2 border border-line rounded-lg px-3 py-2 hover:border-gold transition-colors disabled:opacity-60"
                    >
                      <Archive size={13} />
                      أرشفة
                    </button>
                  ) : (
                    <button
                      onClick={() => runAction(gap.id, "unarchive")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-xs bg-panel2 border border-line rounded-lg px-3 py-2 hover:border-gold transition-colors disabled:opacity-60"
                    >
                      <ArchiveRestore size={13} />
                      إلغاء الأرشفة
                    </button>
                  )}
                  {canPromote && (
                    <button
                      onClick={() => runAction(gap.id, "promote")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-xs bg-gold text-bgDeep font-bold rounded-lg px-3 py-2 hover:bg-goldBright transition-colors disabled:opacity-60"
                    >
                      <ArrowUpCircle size={13} />
                      اعتماد كجزء من الكتاب
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
