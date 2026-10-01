import { useState, type FormEvent } from "react";

interface IdeaFormProps {
  onCreate: (content: string) => Promise<void>;
  disabled: boolean;
}

export default function IdeaForm({ onCreate, disabled }: IdeaFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || saving) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setError("写下一句话，再把它停进来吧。");
      return;
    }

    setSaving(true);
    try {
      await onCreate(trimmed);
      setContent("");
      setError("");
    } catch {
      setError("保存失败，请检查网络后重试。输入内容仍保留在这里。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7">
      <label className="sr-only" htmlFor="new-idea">
        写下一个想法
      </label>
      <textarea
        id="new-idea"
        value={content}
        disabled={disabled || saving}
        onChange={(event) => {
          setContent(event.target.value);
          if (error) setError("");
        }}
        placeholder="它可以还不完整，也不需要马上有答案……"
        rows={4}
        className="min-h-36 w-full resize-y rounded-2xl border border-ink/10 bg-white/80 px-5 py-4 text-base leading-7 text-ink outline-none transition-shadow placeholder:text-ink/65 focus-visible:border-sage/60 focus-visible:ring-2 focus-visible:ring-sage/45 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-ink/70">不必整理好，先替它找个地方停下来。</p>
        <button
          type="submit"
          disabled={disabled || saving || !content.trim()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sage px-6 text-sm font-medium text-white transition-colors hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          <span aria-hidden="true">🚗</span>
          {saving ? "保存中…" : "停进去"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-clay">
        {error}
      </p>
    </form>
  );
}
