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

  function findRoot(story: TreeStory): TreeStory {
    let current = story;
    while (current.parent_story_id) {
      const parent = byId.get(current.parent_story_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  // Build a flat ordered list of the tree rooted at `root` with
  // depth info attached — used for the mobile layout where
  // indentation is replaced by a depth label to avoid the
  // "card becomes a sliver" problem at depth 3-4.
  function flattenTree(root: TreeStory): { story: TreeStory; depth: number }[] {
    const result: { story: TreeStory; depth: number }[] = [];
    function walk(s: TreeStory, d: number) {
      result.push({ story: s, depth: d });
      (childrenOf.get(s.id) ?? []).forEach((child) => walk(child, d + 1));
    }
    walk(root, 0);
    return result;
  }

  const selectedStory = selectedId ? byId.get(selectedId) : null;
  const root = selectedStory ? findRoot(selectedStory) : null;
  const flatNodes = root ? flattenTree(root) : [];

  const statusLabel = (s: TreeStory) =>
    s.status === "completed" ? "Complete" : s.status === "failed" ? "Died" : "In Progress";
  const statusColor = (s: TreeStory) =>
    s.status === "completed" ? "text-cocoa" : s.status === "failed" ? "text-rust" : "text-steel";

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ── TREE AREA ────────────────────────────────── */}
      <div className="lg:w-2/3">
        {!root ? (
          <p className="text-muted">Select a story on the right to see its timeline.</p>
        ) : (
          <>
            {/* Mobile: flat list with depth label instead of indentation */}
            <div className="lg:hidden space-y-2">
              {flatNodes.map(({ story, depth }) => (
                <Link
                  key={story.id}
                  href={`/story/${story.id}`}
                  className={`block rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                    story.id === selectedId
                      ? "border-brass bg-surface2"
                      : "border-surface2 bg-surface hover:border-sage"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {depth > 0 && (
                        <span className="font-mech text-[10px] text-steel shrink-0">
                          {"→".repeat(depth)}
                        </span>
                      )}
                      <span className="font-display text-base truncate">{story.title}</span>
                    </div>
                    <span className={`font-mech text-[10px] uppercase tracking-wide shrink-0 ${statusColor(story)}`}>
                      {statusLabel(story)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 ml-0">
                    {story.slides?.length ?? 0}/{story.slide_budget} slides
                    {depth > 0 && story.branch_point_slide ? ` · from slide ${story.branch_point_slide}` : ""}
                  </p>
                </Link>
              ))}
            </div>

            {/* Desktop: full indented tree */}
            <div className="hidden lg:block">
              <TreeNode story={root} childrenOf={childrenOf} depth={0} highlightId={selectedId} />
            </div>
          </>
        )}
      </div>

      {/* ── STORY LIST ───────────────────────────────── */}
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

// Desktop-only indented tree node
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

  return (
    <div className={depth > 0 ? "ml-6 pl-4 border-l-2 border-surface2 mt-3" : "mt-0"}>
      <Link
        href={`/story/${story.id}`}
        className={`block rounded-xl border-2 px-4 py-3 transition-all duration-200 hover:scale-[1.01] ${
          isHighlighted ? "border-brass bg-surface2" : "border-surface2 bg-surface hover:border-sage"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-cocoa">
            {story.genre === "action" ? "▲" : story.genre === "suspense" ? "◐" : story.genre === "fantasy" ? "✦" : "♡"}
          </span>
          <span
            className={`font-mech text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
              story.status === "completed"
                ? "bg-surface2 text-cocoa"
                : story.status === "failed"
                ? "bg-surface2 text-rust"
                : "bg-surface2 text-steel"
            }`}
          >
            {story.status === "completed" ? "Complete" : story.status === "failed" ? "Died" : "In Progress"}
          </span>
        </div>
        <p className="font-display text-lg mt-1">{story.title}</p>
        <p className="text-xs text-muted mt-0.5">
          {story.slides?.length ?? 0}/{story.slide_budget} slides
          {depth > 0 && story.branch_point_slide ? ` · branched from slide ${story.branch_point_slide}` : ""}
        </p>
      </Link>
      {children.map((child) => (
        <TreeNode key={child.id} story={child} childrenOf={childrenOf} depth={depth + 1} highlightId={highlightId} />
      ))}
    </div>
  );
}
