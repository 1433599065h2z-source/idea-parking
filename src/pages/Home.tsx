import { useState } from "react";
import IdeaCard from "../components/IdeaCard";
import IdeaForm from "../components/IdeaForm";
import TrashList from "../components/TrashList";
import type { CloudIdea } from "../types/idea";

interface HomeProps {
  ideas: CloudIdea[];
  onCreate: (content: string) => Promise<void>;
  onRestore: (id: string) => Promise<CloudIdea | null>;
  trashOpen: boolean;
  onTrashToggle: (open: boolean) => void;
  readOnly: boolean;
  email: string;
  onSignOut: () => Promise<void>;
  signOutBusy: boolean;
  signOutError: string;
}

export default function Home({ ideas, onCreate, onRestore, trashOpen, onTrashToggle, readOnly, email, onSignOut, signOutBusy, signOutError }: HomeProps) {
  const [notice, setNotice] = useState("");

  async function handleCreate(content: string) {
    await onCreate(content);
    setNotice("停好了。它会在这里等你。 ");
    window.setTimeout(() => setNotice(""), 3200);
  }

  const sortedIdeas = [...ideas].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
  const parkedIdeas = sortedIdeas.filter((idea) => !idea.deletedAt && idea.status === "parked");
  const movedIdeas = sortedIdeas.filter((idea) => !idea.deletedAt && idea.status === "moved");
  const trashedIdeas = sortedIdeas.filter((idea) => idea.deletedAt !== null).sort(
    (first, second) => Date.parse(second.deletedAt!) - Date.parse(first.deletedAt!),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage/10 text-lg" aria-hidden="true">🅿️</span>
          <span className="truncate text-sm font-medium tracking-wide text-ink/70">想法停车场</span>
        </div>
        <button type="button" onClick={onSignOut} disabled={signOutBusy} title={email} className="min-h-11 shrink-0 px-2 text-xs text-ink/70 underline hover:text-sage disabled:opacity-50">
          {signOutBusy ? "退出中…" : "退出登录"}
        </button>
      </header>
      {signOutError && <p role="alert" className="mt-2 text-sm text-clay">{signOutError}</p>}

      <section className="mt-16 sm:mt-24" aria-labelledby="page-title">
        <p className="text-xs font-medium tracking-[0.16em] text-sage">IDEA PARKING · 给念头留个位置</p>
        <h1 id="page-title" className="mt-4 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
          今天脑子里冒出了什么？
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/70 sm:text-base">
          不用现在想清楚。先把它停在这里，等有空时再回来。
        </p>
        <IdeaForm onCreate={handleCreate} disabled={readOnly} />
        <p aria-live="polite" className="min-h-5 text-sm text-sage">
          {notice}
        </p>
      </section>

      <section className="mt-14 border-t border-ink/[0.08] pt-8 sm:mt-16" aria-labelledby="recent-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-title" className="font-serif text-2xl text-ink">最近停车</h2>
            <p className="mt-1.5 text-sm text-ink/70">这些念头都还在。</p>
          </div>
          {parkedIdeas.length > 0 && (
            <span className="shrink-0 pb-1 text-xs tabular-nums text-ink/70">{parkedIdeas.length} 个想法</span>
          )}
        </div>

        {parkedIdeas.length > 0 ? (
          <div className="mt-6 space-y-3">
            {parkedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        ) : readOnly ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 px-6 py-10 text-center text-sm text-ink/70">
            本地数据异常，旧想法暂时无法显示；原始数据仍保留在浏览器里。
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 px-6 py-10 text-center">
            <span className="text-2xl" aria-hidden="true">🌙</span>
            <p className="mt-3 text-sm text-ink/65">这里还空着。</p>
            <p className="mt-1 text-sm text-ink/70">想到什么，就从上面停一条吧。</p>
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-ink/[0.08] pt-6" aria-labelledby="moved-title">
        <div className="flex items-center justify-between gap-4">
          <h2 id="moved-title" className="font-serif text-xl">已开走</h2>
          <span className="shrink-0 text-xs tabular-nums text-ink/70">{movedIdeas.length} 个想法</span>
        </div>
        <p className="mt-2 text-xs leading-6 text-ink/70">已经开始行动的念头，仍然留在这里，也可以重新停车。</p>
        {movedIdeas.length > 0 ? (
          <div className="mt-5 space-y-3">
            {movedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        ) : <p className="py-6 text-sm text-ink/70">还没有开走的想法。</p>}
      </section>

      <TrashList ideas={trashedIdeas} onRestore={onRestore} open={trashOpen} onToggle={onTrashToggle} />

      <footer className="mt-16 border-t border-ink/[0.08] pt-5 text-center text-xs leading-5 text-ink/70">
        已登录后保存到云端 · 手机与电脑使用同一账号即可同步
      </footer>
    </main>
  );
}
