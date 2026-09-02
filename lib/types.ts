export type Priority = "high" | "medium" | "normal";

export type ProjectStatus = "ACTIVE" | "COMPLETED";

export interface Gap {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  skills: string[];
}

export interface Project {
  id: string;
  gapId: string;
  title: string;
  owner: string;
  country: string;
  contact?: string;
  summary: string;
  status: ProjectStatus;
  // populated only when status === "COMPLETED"
  achievements?: string;
  results?: string;
  lessonsLearned?: string;
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
