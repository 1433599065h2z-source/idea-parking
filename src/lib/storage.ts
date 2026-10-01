import type { Idea, IdeaStatus } from "../types/idea";

const STORAGE_KEY = "idea-parking-data";
const MIGRATION_KEY_PREFIX = "idea-parking-migration-completed:";

export type StorageLoadResult =
  | { status: "ok"; ideas: Idea[] }
  | { status: "corrupted"; ideas: []; rawData: string | null; reason: string };

function validationError(value: unknown): string | null {
  if (!Array.isArray(value)) return "存储的数据不是想法列表。";

  const ids = new Set<string>();
  for (const [index, entry] of value.entries()) {
    const number = index + 1;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return `第 ${number} 条想法的结构不正确。`;
    }

    const idea = entry as Record<string, unknown>;
    if (typeof idea.id !== "string" || !idea.id.trim()) {
      return `第 ${number} 条想法的 id 无效。`;
    }
    if (ids.has(idea.id)) return "发现重复的想法 id。";
    ids.add(idea.id);

    if (typeof idea.content !== "string" || !idea.content.trim()) {
      return `第 ${number} 条想法的内容为空。`;
    }
    if (idea.status !== "parked" && idea.status !== "moved") {
      return `第 ${number} 条想法的状态无效。`;
    }
    if (typeof idea.createdAt !== "string" || !Number.isFinite(Date.parse(idea.createdAt))) {
      return `第 ${number} 条想法的创建时间无效。`;
    }
    if (typeof idea.updatedAt !== "string" || !Number.isFinite(Date.parse(idea.updatedAt))) {
      return `第 ${number} 条想法的修改时间无效。`;
    }
  }

  return null;
}

export function getIdeas(): StorageLoadResult {
  let rawData: string | null;
  try {
    rawData = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: "corrupted", ideas: [], rawData: null, reason: "无法读取浏览器本地存储。" };
  }

  if (rawData === null) return { status: "ok", ideas: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    return { status: "corrupted", ideas: [], rawData, reason: "本地数据不是有效的 JSON。" };
  }

  const reason = validationError(parsed);
  if (reason) return { status: "corrupted", ideas: [], rawData, reason };
  return { status: "ok", ideas: parsed as Idea[] };
}

function requireHealthyIdeas(): Idea[] {
  const result = getIdeas();
  if (result.status === "corrupted") {
    throw new Error("本地数据异常，已暂停写入，原始数据没有被修改。");
  }
  return result.ideas;
}

export function saveIdeas(ideas: Idea[]): void {
  requireHealthyIdeas();
  const reason = validationError(ideas);
  if (reason) throw new Error(reason);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

export function createIdea(content: string): Idea {
  const ideas = requireHealthyIdeas();
  const trimmed = content.trim();
  if (!trimmed) throw new Error("想法内容不能为空。");

  const now = new Date().toISOString();
  const idea: Idea = {
    id: window.crypto.randomUUID(),
    content: trimmed,
    status: "parked",
    createdAt: now,
    updatedAt: now,
  };

  saveIdeas([idea, ...ideas]);
  return idea;
}

export function updateIdea(
  id: string,
  changes: { content?: string; status?: IdeaStatus },
): Idea | null {
  const ideas = requireHealthyIdeas();
  const existing = ideas.find((idea) => idea.id === id);
  if (!existing) return null;

  const content = changes.content?.trim();
  if (content !== undefined && !content) throw new Error("想法内容不能为空。");
  if (changes.status !== undefined && changes.status !== "parked" && changes.status !== "moved") {
    throw new Error("想法状态无效。");
  }

  const updated: Idea = {
    ...existing,
    ...(content === undefined ? {} : { content }),
    ...(changes.status === undefined ? {} : { status: changes.status }),
    updatedAt: new Date().toISOString(),
  };

  saveIdeas(ideas.map((idea) => (idea.id === id ? updated : idea)));
  return updated;
}

export function hasCompletedMigration(userId: string): boolean {
  try {
    return window.localStorage.getItem(`${MIGRATION_KEY_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markMigrationCompleted(userId: string): void {
  window.localStorage.setItem(`${MIGRATION_KEY_PREFIX}${userId}`, "1");
}
