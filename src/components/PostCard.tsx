"use client";

import { motion } from "framer-motion";
import { Zap, TrendingUp, AlertTriangle } from "lucide-react";

export type CompetitorSteal = {
  id: string;
  competitorName: string;
  originalContent: string;
  targetWeakness: string;
  generatedResponse: string;
  auraOpportunityScore: number;
  projectedAuraGain: number;
  status: "detected" | "analyzing" | "ready" | "stolen";
};

export function PostCard({
  post,
  onSteal,
}: {
  post: CompetitorSteal;
  onSteal: (id: string) => void;
}) {
  const stolen = post.status === "stolen";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-fuchsia-500/20 bg-zinc-900/60 p-5 shadow-[0_0_30px_-15px_rgba(217,70,239,0.5)] backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">
          @{post.competitorName}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-xs font-semibold text-fuchsia-300">
          <TrendingUp size={12} />
          {post.auraOpportunityScore}% opportunity
        </span>
      </div>

      <p className="mt-3 text-sm text-zinc-300">{post.originalContent}</p>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/5 p-3 text-xs text-amber-300">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        {post.targetWeakness}
      </div>

      <div className="mt-3 rounded-lg bg-fuchsia-500/5 p-3 text-sm text-fuchsia-100">
        {post.generatedResponse}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-sm text-emerald-400">
          +{post.projectedAuraGain.toLocaleString("en-US")} aura
        </span>
        <button
          onClick={() => onSteal(post.id)}
          disabled={stolen}
          className="flex items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          <Zap size={14} />
          {stolen ? "Stolen" : "Steal Aura"}
        </button>
      </div>
    </motion.article>
  );
}
