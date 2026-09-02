"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Gap, Project } from "./types";

interface StoreShape {
  gaps: Gap[];
  projects: Project[];
  loading: boolean;
  addGap: (gap: Omit<Gap, "id">) => Promise<Gap>;
  addProject: (project: Omit<Project, "id" | "status">) => Promise<Project>;
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

  const addGap = useCallback(async (gap: Omit<Gap, "id">) => {
    const res = await fetch("/api/gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gap),
    });
    const newGap: Gap = await res.json();
    setGaps((prev) => [newGap, ...prev]);
    return newGap;
  }, []);

  const addProject = useCallback(async (project: Omit<Project, "id" | "status">) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const newProject: Project = await res.json();
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  }, []);

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
      const updated: Project = await res.json();
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
