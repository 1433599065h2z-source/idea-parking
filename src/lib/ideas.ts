import type { CloudIdea, Idea, IdeaStatus } from "../types/idea";
import { supabase } from "./supabase";

interface IdeaRow {
  id: string;
  content: string;
  status: IdeaStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function client() {
  if (!supabase) throw new Error("Supabase 尚未配置。");
  return supabase;
}

function toIdea(row: IdeaRow): CloudIdea {
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

const columns = "id, content, status, created_at, updated_at, deleted_at";

export async function getCloudIdeas(userId: string): Promise<CloudIdea[]> {
  const { data, error } = await client()
    .from("ideas")
    .select(columns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as IdeaRow[]).map(toIdea);
}

export async function createCloudIdea(userId: string, content: string): Promise<CloudIdea> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("想法内容不能为空。");
  const now = new Date().toISOString();

  const { data, error } = await client()
    .from("ideas")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      content: trimmed,
      status: "parked",
      created_at: now,
      updated_at: now,
    })
    .select(columns)
    .single();

  if (error) throw error;
  return toIdea(data as IdeaRow);
}

export async function updateCloudIdea(
  userId: string,
  id: string,
  changes: { content: string; status: IdeaStatus },
): Promise<CloudIdea | null> {
  const trimmed = changes.content.trim();
  if (!trimmed) throw new Error("想法内容不能为空。");

  const { data, error } = await client()
    .from("ideas")
    .update({ content: trimmed, status: changes.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(columns)
    .maybeSingle();

  if (error) throw error;
  return data ? toIdea(data as IdeaRow) : null;
}

async function changeTrashState(action: "trash_idea" | "restore_idea", id: string): Promise<CloudIdea | null> {
  // The database uses the signed-in user and its own clock, not a browser-supplied timestamp.
  const { data, error } = await client().rpc(action, { p_idea_id: id }).maybeSingle();
  if (error) throw error;
  return data ? toIdea(data as IdeaRow) : null;
}

export function trashCloudIdea(id: string): Promise<CloudIdea | null> {
  return changeTrashState("trash_idea", id);
}

export function restoreCloudIdea(id: string): Promise<CloudIdea | null> {
  return changeTrashState("restore_idea", id);
}

export async function importLegacyIdeas(userId: string, ideas: Idea[]): Promise<void> {
  // Small batches keep a retry safe if the network stops partway through.
  for (let start = 0; start < ideas.length; start += 100) {
    const batch = ideas.slice(start, start + 100);
    const rows = batch.map((idea) => ({
      id: idea.id,
      user_id: userId,
      content: idea.content,
      status: idea.status,
      created_at: idea.createdAt,
      updated_at: idea.updatedAt,
    }));

    const { error } = await client()
      .from("ideas")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;

    const { data: present, error: checkError } = await client()
      .from("ideas")
      .select("id")
      .eq("user_id", userId)
      .in("id", batch.map((idea) => idea.id));
    if (checkError) throw checkError;
    if (present?.length !== batch.length) {
      throw new Error("有旧想法未能同步到当前账号，原始本地数据仍保留。");
    }
  }
}
