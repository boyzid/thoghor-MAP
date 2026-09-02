"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Gap, Project } from "./types";
import { INITIAL_GAPS, INITIAL_PROJECTS } from "./data";

interface StoreShape {
  gaps: Gap[];
  projects: Project[];
  addGap: (gap: Omit<Gap, "id">) => Gap;
  addProject: (project: Omit<Project, "id" | "status">) => Project;
  completeProject: (
    projectId: string,
    payload: { achievements: string; results: string; lessonsLearned: string }
  ) => void;
  getGap: (id: string) => Gap | undefined;
  getProject: (id: string) => Project | undefined;
  getProjectsForGap: (gapId: string) => Project[];
  countProjectsForGap: (gapId: string) => number;
}

const StoreContext = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [gaps, setGaps] = useState<Gap[]>(INITIAL_GAPS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  const addGap = useCallback((gap: Omit<Gap, "id">) => {
    const newGap: Gap = { ...gap, id: "g" + Date.now() };
    setGaps((prev) => [newGap, ...prev]);
    return newGap;
  }, []);

  const addProject = useCallback((project: Omit<Project, "id" | "status">) => {
    const newProject: Project = { ...project, id: "p" + Date.now(), status: "ACTIVE" };
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  }, []);

  const completeProject = useCallback(
    (
      projectId: string,
      payload: { achievements: string; results: string; lessonsLearned: string }
    ) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                status: "COMPLETED",
                achievements: payload.achievements,
                results: payload.results,
                lessonsLearned: payload.lessonsLearned,
              }
            : p
        )
      );
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
