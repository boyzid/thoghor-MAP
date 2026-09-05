"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Gap, Project } from "./types";

interface StoreShape {
  gaps: Gap[];
  projects: Project[];
  loading: boolean;
  addGap: (gap: Omit<Gap, "id" | "creatorId">) => Promise<Gap>;
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

  const addGap = useCallback(async (gap: Omit<Gap, "id" | "creatorId">) => {
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
