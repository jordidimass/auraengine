"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { AuraCounter } from "@/components/AuraCounter";
import { PostCard, type CompetitorSteal } from "@/components/PostCard";

// Mock feed until Hugo wires:
// useAction(api.analysis.analyzeUrl) + useQuery(api.analysis.getPost)
const MOCK_FEED: CompetitorSteal[] = [
  {
    id: "1",
    competitorName: "rivalstartup",
    originalContent:
      "Our new dashboard redesign is finally live. Took us 6 months but worth it!",
    targetWeakness:
      "Replies are pointing out the redesign removed dark mode and broke keyboard shortcuts.",
    generatedResponse:
      "6 months for a redesign that ships without dark mode? We shipped ours with day-one shortcut support.",
    auraOpportunityScore: 82,
    projectedAuraGain: 4200,
    status: "ready",
  },
  {
    id: "2",
    competitorName: "growthbro",
    originalContent:
      "Hot take: AI agents are overhyped and will plateau in 2026.",
    targetWeakness:
      "No data cited, thread is getting ratio'd by builders shipping agent products daily.",
    generatedResponse:
      "Plateau? We shipped 3 agent releases this quarter. Overhyped things don't ship, they get talked about.",
    auraOpportunityScore: 67,
    projectedAuraGain: 2100,
    status: "detected",
  },
];

export default function Home() {
  const [feed, setFeed] = useState(MOCK_FEED);

  const totalAura = feed
    .filter((post) => post.status === "stolen")
    .reduce((sum, post) => sum + post.projectedAuraGain, 0);

  function stealAura(id: string) {
    setFeed((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, status: "stolen" } : post,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.08),_transparent_60%)] text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-10">
        <div className="flex items-center gap-2">
          <Radar className="text-fuchsia-400" size={22} />
          <h1 className="text-xl font-bold tracking-tight">AuraEngine</h1>
        </div>
        <AuraCounter value={totalAura} />
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-24">
        {feed.map((post) => (
          <PostCard key={post.id} post={post} onSteal={stealAura} />
        ))}
      </main>
    </div>
  );
}
