import { useEffect, useRef, useState } from "react";
import { Route, Routes, ScrollRestoration } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { createCloudIdea, getCloudIdeas, importLegacyIdeas, restoreCloudIdea, trashCloudIdea, updateCloudIdea } from "./lib/ideas";
import { getIdeas, hasCompletedMigration, markMigrationCompleted, type StorageLoadResult } from "./lib/storage";
import { supabase } from "./lib/supabase";
import Home from "./pages/Home";
import IdeaDetail from "./pages/IdeaDetail";
import Login from "./pages/Login";
import type { CloudIdea, IdeaStatus } from "./types/idea";

const scrollKey = ({ pathname }: { pathname: string }) => pathname;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [ideas, setIdeas] = useState<CloudIdea[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [ideasState, setIdeasState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);
  const [legacy, setLegacy] = useState<StorageLoadResult>(getIdeas);
  const [migrationDismissedFor, setMigrationDismissedFor] = useState<string | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const [migrationNotice, setMigrationNotice] = useState("");
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const currentUserId = useRef<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (currentUserId.current !== nextUserId) {
        currentUserId.current = nextUserId;
        setIdeas([]);
        setIdeasState("idle");
        setTrashOpen(false);
      }
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIdeas([]);
      setIdeasState("idle");
      return;
    }
    let active = true;
    setIdeas([]);
    setIdeasState("loading");
    setLegacy(getIdeas());
    getCloudIdeas(userId).then((loaded) => {
      if (!active) return;
      setIdeas(loaded);
      setIdeasState("ready");
    }).catch(() => {
      if (active) setIdeasState("error");
    });
    return () => { active = false; };
  }, [userId, retryCount]);

  async function handleCreate(content: string): Promise<void> {
    if (!userId) throw new Error("请先登录。");
    const created = await createCloudIdea(userId, content);
    if (currentUserId.current === userId) setIdeas((current) => [created, ...current]);
  }

  async function handleUpdate(id: string, changes: { content: string; status: IdeaStatus }): Promise<CloudIdea | null> {
    if (!userId) throw new Error("请先登录。");
    const updated = await updateCloudIdea(userId, id, changes);
    if (updated && currentUserId.current === userId) {
      setIdeas((current) => current.map((idea) => idea.id === id ? updated : idea));
    }
    return updated;
  }

  async function handleTrash(id: string): Promise<CloudIdea | null> {
    if (!userId) throw new Error("请先登录。");
    const trashed = await trashCloudIdea(id);
    if (trashed && currentUserId.current === userId) {
      setIdeas((current) => current.map((idea) => idea.id === id ? trashed : idea));
    }
    return trashed;
  }

  async function handleRestore(id: string): Promise<CloudIdea | null> {
    if (!userId) throw new Error("请先登录。");
    const restored = await restoreCloudIdea(id);
    if (restored && currentUserId.current === userId) {
      setIdeas((current) => current.map((idea) => idea.id === id ? restored : idea));
    }
    return restored;
  }

  async function handleImport(): Promise<void> {
    if (!userId || legacy.status !== "ok" || migrationBusy) return;
    setMigrationBusy(true);
    setMigrationError("");
    setMigrationNotice("");
    try {
      await importLegacyIdeas(userId, legacy.ideas);
      const loaded = await getCloudIdeas(userId);
      if (currentUserId.current !== userId) return;
      setIdeas(loaded);
      setMigrationDismissedFor(userId);
      try {
        markMigrationCompleted(userId);
        setMigrationNotice("旧想法已同步到云端；浏览器中的原始数据仍保留。");
      } catch {
        setMigrationNotice("旧想法已同步，但无法记录本地完成标记。原始数据仍保留。");
      }
    } catch {
      setMigrationError("旧想法同步失败，请检查网络和 Supabase 配置后重试；本地原始数据未修改。");
    } finally {
      setMigrationBusy(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    if (!supabase) return;
    setSignOutBusy(true);
    setSignOutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      setSignOutError("退出失败，请检查网络后重试。");
    } finally {
      setSignOutBusy(false);
    }
  }

  if (!supabase) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-ink sm:px-8">
        <h1 className="font-serif text-2xl">想法停车场</h1>
        <p className="mt-5 text-sm leading-7">云端尚未配置。请按 README 创建 Supabase 项目，并在 .env.local 中填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。</p>
        <p className="mt-3 text-sm leading-7 text-ink/70">这个浏览器里原有的本地想法不会被删除；配置登录后可以选择同步。</p>
      </main>
    );
  }

  if (authLoading) {
    return <main role="status" className="mx-auto max-w-lg px-5 py-16 text-sm text-ink/75">正在确认登录状态…</main>;
  }

  if (!session || !userId) return <Login />;

  if (ideasState === "loading" || ideasState === "idle") {
    return <main role="status" className="mx-auto max-w-lg px-5 py-16 text-sm text-ink/75">正在读取想法…</main>;
  }

  if (ideasState === "error") {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-ink sm:px-8">
        <h1 className="font-serif text-2xl">暂时无法读取想法</h1>
        <p role="alert" className="mt-4 text-sm leading-7 text-clay">请检查网络连接、数据表和权限设置。你的输入和云端数据没有被清除。</p>
        <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-6 min-h-11 rounded-full bg-sage px-6 text-sm text-white hover:bg-sage-dark">重试</button>
        <button type="button" onClick={handleSignOut} disabled={signOutBusy} className="ml-4 min-h-11 text-sm text-ink/75 underline">退出登录</button>
        <p role="alert" className="mt-3 text-sm text-clay">{signOutError}</p>
      </main>
    );
  }

  const showMigration = legacy.status === "ok" && legacy.ideas.length > 0
    && !hasCompletedMigration(userId) && migrationDismissedFor !== userId;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {legacy.status === "corrupted" && (
        <div role="alert" className="mx-auto max-w-3xl px-5 pt-6 text-sm leading-6 text-clay sm:px-8">
          本地旧数据异常，未自动上传；原始数据仍保留。{legacy.reason}
        </div>
      )}
      {showMigration && (
        <div className="mx-auto max-w-3xl px-5 pt-6 sm:px-8">
          <div className="rounded-2xl border border-sage/25 bg-white/75 p-5 text-sm leading-6">
            <p>发现这个浏览器里有 {legacy.ideas.length} 条旧想法，要同步到云端吗？</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={handleImport} disabled={migrationBusy} className="min-h-11 rounded-full bg-sage px-5 text-white hover:bg-sage-dark disabled:opacity-50">
                {migrationBusy ? "正在同步…" : "同步到云端"}
              </button>
              <button type="button" onClick={() => setMigrationDismissedFor(userId)} disabled={migrationBusy} className="min-h-11 px-2 text-ink/75 underline">暂时不要</button>
            </div>
            <p role="alert" className="mt-2 text-clay">{migrationError}</p>
          </div>
        </div>
      )}
      {migrationNotice && <p role="status" className="mx-auto max-w-3xl px-5 pt-5 text-sm text-sage sm:px-8">{migrationNotice}</p>}
      <Routes>
        <Route path="/" element={<Home ideas={ideas} onCreate={handleCreate} onRestore={handleRestore} trashOpen={trashOpen} onTrashToggle={setTrashOpen} readOnly={false} email={session.user.email ?? ""} onSignOut={handleSignOut} signOutBusy={signOutBusy} signOutError={signOutError} />} />
        <Route path="/idea/:id" element={<IdeaDetail ideas={ideas} onUpdate={handleUpdate} onTrash={handleTrash} dataCorrupted={false} />} />
        <Route path="*" element={<Home ideas={ideas} onCreate={handleCreate} onRestore={handleRestore} trashOpen={trashOpen} onTrashToggle={setTrashOpen} readOnly={false} email={session.user.email ?? ""} onSignOut={handleSignOut} signOutBusy={signOutBusy} signOutError={signOutError} />} />
      </Routes>
      <ScrollRestoration getKey={scrollKey} />
    </div>
  );
}
