export type IdeaStatus = "parked" | "moved";

export interface Idea {
  id: string;
  content: string;
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}

// Keep the V0.1 local format unchanged; only cloud records have a trash timestamp.
export interface CloudIdea extends Idea {
  deletedAt: string | null;
}
