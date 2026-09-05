export type Priority = "high" | "medium" | "normal";

export type ProjectStatus = "ACTIVE" | "COMPLETED";

export type Role = "USER" | "ADMIN";

export interface Gap {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  skills: string[];
  creatorId: string | null;
}

export interface Result {
  id: string;
  projectId: string;
  title: string;
  description: string;
}

export interface Lesson {
  id: string;
  projectId: string;
  title: string;
  description: string;
}

export interface Project {
  id: string;
  gapId: string;
  creatorId: string | null;
  title: string;
  owner: string;
  country: string;
  contact?: string;
  summary: string;
  status: ProjectStatus;
  // populated only when status === "COMPLETED"
  results: Result[];
  lessons: Lesson[];
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "عالية",
  medium: "متوسطة",
  normal: "عادية",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: "نشط",
  COMPLETED: "منتهٍ",
};
