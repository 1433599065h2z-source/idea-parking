import { Link } from "react-router-dom";
import { formatIdeaDate } from "../lib/date";
import type { Idea } from "../types/idea";

interface IdeaCardProps {
  idea: Idea;
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  const excerpt = idea.content.length > 150 ? `${idea.content.slice(0, 150)}…` : idea.content;
  const parked = idea.status === "parked";
  const createdLabel = formatIdeaDate(idea.createdAt);

  return (
    <Link
      to={`/idea/${idea.id}`}
      className="idea-card group block rounded-2xl border border-ink/[0.07] bg-white/75 p-5 transition-colors duration-200 hover:border-ink/[0.15] hover:bg-white sm:p-6"
      aria-label={`想法：${excerpt}；状态：${parked ? "停车中" : "已开走"}；创建于${createdLabel}`}
    >
      <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-ink/85 sm:text-base">
        {excerpt}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink/70">
        <time dateTime={idea.createdAt}>{createdLabel}</time>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${parked ? "bg-sage/10 text-sage" : "bg-clay/10 text-clay"}`}
        >
          <span aria-hidden="true">{parked ? "🚗" : "🚀"}</span>
          {parked ? "停车中" : "已开走"}
        </span>
      </div>
    </Link>
  );
}
