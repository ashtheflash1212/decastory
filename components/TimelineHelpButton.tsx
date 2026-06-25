"use client";

import { useState } from "react";

export default function TimelineHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How does the Timeline Tree work?"
        className="w-8 h-8 rounded-full border-2 border-steel text-steel font-mech text-sm transition-all duration-200 hover:scale-110 hover:bg-steel hover:text-surface"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-2xl border-2 border-surface2 p-7 max-w-lg w-full shadow-xl relative"
          >
            <button
              onClick={() => setOpen(false)}
              title="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-surface2 text-muted hover:border-rust hover:text-rust transition-all duration-200 hover:scale-110"
            >
              ✕
            </button>

            <h2 className="font-display text-2xl mb-4 pr-8">How the Timeline Tree works</h2>

            <p className="text-[15px] leading-relaxed mb-3">
              Every time you use Timeline Split, that branch gets remembered. This page is where you can see those
              branches laid out as a family tree instead of just separate cards in your Vault.
            </p>
            <p className="text-[15px] leading-relaxed mb-3">
              Pick any story from the list on the right, and the app traces it all the way back to its original
              version — even if you're looking at a branch of a branch — then draws the whole lineage on the left.
              The story at the top with no "branched from" note is the original. Anything indented underneath it is
              a fork, labeled with exactly which slide it split off from.
            </p>
            <p className="text-[15px] leading-relaxed">
              Click any card inside the tree to jump straight into that version and keep reading or playing. If a
              story has never been split, its "tree" is just itself — nothing to see until you actually fork
              something.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
