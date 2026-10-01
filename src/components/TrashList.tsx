import { useEffect, useState } from "react";
import { formatIdeaDate } from "../lib/date";
import { trashExpiresAt, trashTimeLabel } from "../lib/trash";
import type { CloudIdea } from "../types/idea";

interface TrashListProps {
  ideas: CloudIdea[];
  onRestore: (id: string) => Promise<CloudIdea | null>;
  open: boolean;
  onToggle: (open: boolean) => void;
}

export default function TrashList({ ideas, onRestore, open, onToggle }: TrashListProps) {
  const [now, setNow] = useState(Date.now);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleRestore(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const restored = await onRestore(id);
      if (!restored) {
        setError("这条想法已过恢复期限或已被清理，请刷新列表。");
        return;
      }
      setNotice(`已恢复到“${restored.status === "parked" ? "最近停车" : "已开走"}”。`);
    } catch {
      setError("恢复失败，请检查网络后重试。废纸篓中的内容仍保留。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <details open={open} onToggle={(event) => onToggle(event.currentTarget.open)} className="mt-8 border-t border-ink/[0.08] pt-5">
      <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm text-ink/75">
        废纸篓 · {ideas.length}
      </summary>
      <p className="mt-2 text-xs leading-6 text-ink/70">删除后保留七天，可在期限内恢复。云端每小时清理到期内容，恢复期限以云端时间为准。</p>
      <p role="status" className="mt-2 text-sm text-sage">{notice}</p>
      {error && <p role="alert" className="mt-2 text-sm text-clay">{error}</p>}
      {ideas.length === 0 ? (
        <p className="py-6 text-sm text-ink/70">废纸篓是空的。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ideas.map((idea) => {
            const deletedAt = idea.deletedAt!;
            const expired = !Number.isFinite(trashExpiresAt(deletedAt)) || now >= trashExpiresAt(deletedAt);
            return (
              <li key={idea.id} className="rounded-2xl border border-ink/10 bg-white/60 p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/85">{idea.content}</p>
                <p className="mt-3 text-xs text-ink/70">原状态：{idea.status === "parked" ? "停车中" : "已开走"}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs leading-6 text-ink/70">
                    <p>删除于 <time dateTime={deletedAt}>{formatIdeaDate(deletedAt)}</time></p>
                    <p>{trashTimeLabel(deletedAt, now)}</p>
                  </div>
                  <button type="button" disabled={expired || busyId !== null} onClick={() => handleRestore(idea.id)}
                    aria-label={`恢复想法：${idea.content.slice(0, 150)}`}
                    className="min-h-11 shrink-0 rounded-full border border-sage/30 px-5 text-sm text-sage hover:bg-sage/10 disabled:cursor-not-allowed disabled:opacity-60">
                    {busyId === idea.id ? "恢复中…" : "恢复"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
