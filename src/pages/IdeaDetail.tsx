import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { formatIdeaDate } from "../lib/date";
import type { CloudIdea, IdeaStatus } from "../types/idea";

interface IdeaDetailProps {
  ideas: CloudIdea[];
  onUpdate: (id: string, changes: { content: string; status: IdeaStatus }) => Promise<CloudIdea | null>;
  onTrash: (id: string) => Promise<CloudIdea | null>;
  dataCorrupted: boolean;
}

export default function IdeaDetail({ ideas, onUpdate, onTrash, dataCorrupted }: IdeaDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const savingNavigation = useRef(false);
  const idea = ideas.find((item) => item.id === id && item.deletedAt === null);
  const [content, setContent] = useState(idea?.content ?? "");
  const [status, setStatus] = useState<IdeaStatus>(idea?.status ?? "parked");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const busy = saving || deleting;

  useEffect(() => {
    setContent(idea?.content ?? "");
    setStatus(idea?.status ?? "parked");
  }, [idea?.id, idea?.content, idea?.status]);

  const hasChanges = idea ? content !== idea.content || status !== idea.status : false;
  const blocker = useBlocker(() => hasChanges && !savingNavigation.current);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("你有尚未保存的修改，确定离开吗？")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!hasChanges) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasChanges]);

  if (!idea) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/" className="text-sm text-sage hover:text-sage-dark">← 返回最近停车</Link>
        <div className="mt-16 rounded-2xl border border-ink/10 bg-white/70 px-6 py-12 text-center">
          <span className="text-3xl" aria-hidden="true">🅿️</span>
          <h1 className="mt-4 font-serif text-2xl text-ink">{dataCorrupted ? "本地数据暂时无法显示" : "这里暂时没有这条想法"}</h1>
          <p className="mt-2 text-sm text-ink/70">
            {dataCorrupted ? "为了保护原始数据，当前已暂停读取和写入。" : "它可能已移入废纸篓或被清理；请返回首页查看。"}
          </p>
        </div>
      </main>
    );
  }

  const currentIdea = idea;

  async function handleSave() {
    if (busy) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setError("想法内容还不能留空。");
      return;
    }
    setSaving(true);
    try {
      const updated = await onUpdate(currentIdea.id, { content: trimmed, status });
      if (!updated) {
        setError("这条想法可能已移入废纸篓或被清理。修改内容仍保留，请返回首页刷新列表。");
        return;
      }
      savingNavigation.current = true;
      navigate("/", { replace: true });
    } catch {
      setError("保存失败，请检查网络后重试。修改内容仍保留在这里。");
    } finally {
      setSaving(false);
    }
  }

  function handleStatusChange(nextStatus: IdeaStatus) {
    setStatus(nextStatus);
    setError("");
    setConfirmingDelete(false);
  }

  function handleDelete() {
    if (busy) return;
    if (hasChanges) {
      setError("你有尚未保存的修改，请先保存，再删除这条想法。");
      return;
    }
    setConfirmingDelete(true);
    setError("");
  }

  async function handleConfirmDelete() {
    if (busy || !confirmingDelete || hasChanges) return;
    setDeleting(true);
    setError("");
    try {
      const trashed = await onTrash(currentIdea.id);
      if (!trashed) {
        setError("没有找到这条想法，请返回首页刷新列表。");
        return;
      }
      savingNavigation.current = true;
      navigate("/", { replace: true });
    } catch {
      setError("移入废纸篓失败，请检查网络后重试。想法未从当前页面移除。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/75 transition-colors hover:text-sage">
        <span aria-hidden="true">←</span> 返回最近停车
      </Link>

      <article className="mt-9 rounded-3xl border border-ink/[0.08] bg-white/80 p-5 shadow-[0_12px_44px_rgba(42,48,37,0.045)] sm:mt-12 sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-medium tracking-[0.14em] text-sage">一条想法</p>
          <span className="text-xs text-ink/70">最后修改于 {formatIdeaDate(currentIdea.updatedAt)}</span>
        </div>

        <label htmlFor="idea-content" className="sr-only">编辑想法内容</label>
        <textarea
          id="idea-content"
          value={content}
          disabled={busy}
          onChange={(event) => {
            setContent(event.target.value);
            setError("");
            setConfirmingDelete(false);
          }}
          rows={Math.max(7, content.split("\n").length + 2)}
          className="mt-6 min-h-52 w-full resize-y rounded-lg border-0 bg-transparent p-0 text-base leading-8 text-ink outline-none placeholder:text-ink/65 focus-visible:ring-2 focus-visible:ring-sage/50 sm:text-lg"
          placeholder="写下你的想法……"
        />

        <div className="border-t border-ink/[0.08] pt-5">
          <p className="text-xs text-ink/70">创建于 {formatIdeaDate(currentIdea.createdAt)}</p>
          <div className="mt-5">
            <p className="text-xs text-ink/70">它现在的状态 · 选择后点击保存修改</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={status === "parked"}
                disabled={busy}
                onClick={() => handleStatusChange("parked")}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${status === "parked" ? "border-sage/25 bg-sage/10 text-sage" : "border-ink/10 text-ink/70 hover:bg-ink/[0.03]"}`}
              >
                🚗 停车中
              </button>
              <button
                type="button"
                aria-pressed={status === "moved"}
                disabled={busy}
                onClick={() => handleStatusChange("moved")}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${status === "moved" ? "border-clay/25 bg-clay/10 text-clay" : "border-ink/10 text-ink/70 hover:bg-ink/[0.03]"}`}
              >
                🚀 已开走
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <p aria-live="polite" className="min-h-5 text-sm text-clay">{error}</p>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="min-h-11 rounded-full bg-sage px-6 text-sm font-medium text-white transition-colors hover:bg-sage-dark disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存修改"}
          </button>
        </div>
      </article>
      <p className="mt-5 px-1 text-xs leading-5 text-ink/70">创建时间不会改变；每次保存内容或状态后，最后修改时间都会更新。</p>
      <div className="mt-8 border-t border-ink/10 pt-4">
        {confirmingDelete ? (
          <div role="group" aria-labelledby="trash-confirm-title" className="rounded-2xl border border-clay/25 bg-white/60 p-4">
            <p id="trash-confirm-title" className="text-sm leading-6">将这条想法移入废纸篓？七天内可以恢复，之后会永久清理。</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={handleConfirmDelete} disabled={busy}
                className="min-h-11 rounded-full border border-clay/35 px-5 text-sm text-clay hover:bg-clay/10 disabled:opacity-50">
                {deleting ? "正在移入废纸篓…" : "确认移入废纸篓"}
              </button>
              <button type="button" autoFocus onClick={() => setConfirmingDelete(false)} disabled={busy}
                className="min-h-11 rounded-full px-5 text-sm text-ink/75 hover:bg-ink/5 disabled:opacity-50">取消</button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={handleDelete} disabled={busy}
              className="min-h-11 rounded-lg px-2 text-sm text-clay underline underline-offset-4 hover:bg-clay/5 disabled:opacity-50">删除想法</button>
            <p className="mt-1 px-2 text-xs leading-6 text-ink/70">先移入废纸篓，七天内可以恢复。</p>
          </>
        )}
      </div>
    </main>
  );
}
