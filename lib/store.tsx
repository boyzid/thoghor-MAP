"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Gap, Project } from "./types";

type AddGapInput = Omit<Gap, "id" | "creatorId" | "status" | "source" | "creator">;
type UpdateGapInput = Partial<
  Pick<Gap, "title" | "description" | "category" | "priority" | "skills">
>;

interface StoreShape {
  gaps: Gap[];
  projects: Project[];
  loading: boolean;
  addGap: (gap: AddGapInput) => Promise<Gap>;
  updateGap: (gapId: string, data: UpdateGapInput) => Promise<Gap>;
  archiveGap: (gapId: string) => Promise<Gap>;
  fetchGap: (gapId: string) => Promise<Gap | null>;
  addProject: (
    project: Omit<Project, "id" | "status" | "creatorId" | "results" | "lessons">
  ) => Promise<Project>;
  completeProject: (
    projectId: string,
    payload: { achievements: string; results: string; lessonsLearned: string }
  ) => Promise<void>;
  getGap: (id: string) => Gap | undefined;
  getProject: (id: string) => Project | undefined;
  getProjectsForGap: (gapId: string) => Project[];
  countProjectsForGap: (gapId: string) => number;
}

const StoreContext = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [gapsRes, projectsRes] = await Promise.all([
          fetch("/api/gaps"),
          fetch("/api/projects"),
        ]);
        const [gapsData, projectsData] = await Promise.all([
          gapsRes.json(),
          projectsRes.json(),
        ]);
        if (!cancelled) {
          setGaps(gapsData);
          setProjects(projectsData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addGap = useCallback(async (gap: AddGapInput) => {
    const res = await fetch("/api/gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gap),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "تعذّر إنشاء الثغر");
    const newGap: Gap = data;
    setGaps((prev) => [newGap, ...prev]);
    return newGap;
  }, []);

  const updateGap = useCallback(async (gapId: string, data: UpdateGapInput) => {
    const res = await fetch(`/api/gaps/${gapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || "تعذّر تحديث الثغر");
    const updated: Gap = body;
    setGaps((prev) => prev.map((g) => (g.id === gapId ? updated : g)));
    return updated;
  }, []);

  const archiveGap = useCallback(async (gapId: string) => {
    const res = await fetch(`/api/gaps/${gapId}/archive`, {
      method: "PATCH",
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || "تعذّر أرشفة الثغر");
    const updated: Gap = body;
    // Archived gaps drop out of the public list, matching the server's own
    // ACTIVE-only listing rule.
    setGaps((prev) => prev.filter((g) => g.id !== gapId));
    return updated;
  }, []);

  const fetchGap = useCallback(async (gapId: string) => {
    const res = await fetch(`/api/gaps/${gapId}`);
    if (res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "تعذّر تحميل الثغر");
    return data as Gap;
  }, []);

  const addProject = useCallback(
    async (project: Omit<Project, "id" | "status" | "creatorId" | "results" | "lessons">) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّر إنشاء المشروع");
      const newProject: Project = { ...data, results: data.results ?? [], lessons: data.lessons ?? [] };
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    },
    []
  );

  const completeProject = useCallback(
    async (
      projectId: string,
      payload: { achievements: string; results: string; lessonsLearned: string }
    ) => {
      const res = await fetch(`/api/projects/${projectId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّر إنهاء المشروع");
      const updated: Project = data;
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    },
    []
  );

  const getGap = useCallback((id: string) => gaps.find((g) => g.id === id), [gaps]);
  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );
  const getProjectsForGap = useCallback(
    (gapId: string) => projects.filter((p) => p.gapId === gapId),
    [projects]
  );
  const countProjectsForGap = useCallback(
    (gapId: string) => projects.filter((p) => p.gapId === gapId).length,
    [projects]
  );

  return (
    <StoreContext.Provider
      value={{
        gaps,
        projects,
        loading,
        addGap,
        updateGap,
        archiveGap,
        fetchGap,
        addProject,
        completeProject,
        getGap,
        getProject,
        getProjectsForGap,
        countProjectsForGap,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
