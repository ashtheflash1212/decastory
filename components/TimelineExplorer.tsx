"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const GENRE_ICON: Record<string, string> = {
  action: "▲",
  suspense: "◐",
  fantasy: "✦",
  romance: "♡",
};

type TreeStory = {
  id: string;
  title: string;
  genre: string;
  status: string;
  slide_budget: number;
  parent_story_id: string | null;
  branch_point_slide: number | null;
  created_at: string;
  slides?: { slide_number: number }[];
};

export default function TimelineExplorer({ stories }: { stories: TreeStory[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(stories[0]?.id ?? null);

  const byId = useMemo(() => {
    const map = new Map<string, TreeStory>();
    stories.forEach((s) => map.set(s.id, s));
    return map;
  }, [stories]);

  const childrenOf = useMemo(() => {
    const map = new Map<string, TreeStory[]>();
    stories.forEach((s) => {
      if (!s.parent_story_id) return;
      const list = map.get(s.parent_story_id) ?? [];
      list.push(s);
      map.set(s.parent_story_id, list);
    });
    return map;
  }, [stories]);

  // Walk up parent_story_id until we hit a story with no parent —
  // that's the root of this story's whole branch family.
  function findRoot(story: TreeStory): TreeStory {
    let current = story;
    while (current.parent_story_id) {
      const parent = byId.get(current.parent_story_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  const selectedStory = selectedId ? byId.get(selectedId) : null;
  const root = selectedStory ? findRoot(selectedStory) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Tree — main area, roughly 2/3 width */}
      <div className="lg:w-2/3 min-h-[400px]">
        {!root ? (
          <p className="text-muted">Select a story on the right to see its timeline.</p>
        ) : (
          <TreeNode story={root} childrenOf={childrenOf} depth={0} highlightId={selectedId} />
        )}
      </div>

      {/* Story list — scrollable, roughly 1/3 width */}
      <div className="lg:w-1/3">
        <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Your Stories</h2>
        <div className="max-h-[600px] overflow-y-auto space-y-2 border-2 border-surface2 rounded-xl p-3 pr-2 bg-surface/40">
          {stories.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-all duration-200 ${
                selectedId === s.id
                  ? "border-brass bg-surface2"
                  : "border-surface2 bg-surface hover:border-sage"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-cocoa">{GENRE_ICON[s.genre] ?? "●"}</span>
                <span className="font-display text-base truncate">{s.title}</span>
              </div>
              {s.parent_story_id && (
                <p className="text-xs text-steel mt-1">↳ branch from slide {s.branch_point_slide}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeNode({
  story,
  childrenOf,
  depth,
  highlightId,
}: {
  story: TreeStory;
  childrenOf: Map<string, TreeStory[]>;
  depth: number;
  highlightId: string | null;
}) {
  const children = childrenOf.get(story.id) ?? [];
  const isHighlighted = story.id === highlightId;
  // Indentation grows for the first 3 levels, then stops adding
  // further margin — otherwise a branch-of-a-branch-of-a-branch
  // chain compounds enough cumulative indent to squeeze content
  // into a sliver on narrow phones. Deeper levels still nest in the
  // tree structure itself, just without visually indenting further.
  const wrapperClass = depth === 0 ? "mt-0" : depth <= 3 ? "ml-3 sm:ml-6 pl-2 sm:pl-4 border-l-2 border-surface2 mt-2 sm:mt-3" : "mt-2 sm:mt-3";

  return (
    <div className={wrapperClass}>
      <Link
        href={`/story/${story.id}`}
        className={`block rounded-xl border-2 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 hover:scale-[1.01] ${
          isHighlighted ? "border-brass bg-surface2" : "border-surface2 bg-surface hover:border-sage"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-cocoa">{GENRE_ICON[story.genre] ?? "●"}</span>
          <span
            className={`font-mech text-[9px] sm:text-[10px] uppercase tracking-wide px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap ${
              story.status === "completed" ? "bg-surface2 text-cocoa" : "bg-surface2 text-steel"
            }`}
          >
            {story.status === "completed" ? "Complete" : "In Progress"}
          </span>
        </div>
        <p className="font-display text-base sm:text-lg mt-1 truncate">{story.title}</p>
        <p className="text-[11px] sm:text-xs text-muted mt-0.5">
          {story.slides?.length ?? 0}/{story.slide_budget} slides
          {depth > 0 && story.branch_point_slide ? ` · from slide ${story.branch_point_slide}` : ""}
        </p>
      </Link>

      {children.map((child) => (
        <TreeNode key={child.id} story={child} childrenOf={childrenOf} depth={depth + 1} highlightId={highlightId} />
      ))}
    </div>
  );
}
